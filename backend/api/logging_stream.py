import asyncio
import collections
import json
import logging
import queue
import threading
from typing import AsyncGenerator, List
from fastapi import Request

recent_logs = collections.deque(maxlen=200)
subscribers_lock = threading.Lock()
active_subscribers: List[queue.Queue] = []


class APILogHandler(logging.Handler):
    """Logging handler untuk mengalirkan log ke in-memory buffer dan subscriber queues."""
    def emit(self, record):
        try:
            msg = self.format(record)
            recent_logs.append(msg)
            with subscribers_lock:
                for sub_q in list(active_subscribers):
                    try:
                        sub_q.put_nowait(msg)
                    except queue.Full:
                        pass
        except Exception:
            self.handleError(record)


def setup_api_logging():
    """Memasang handler SSE ke root logger."""
    api_log_handler = APILogHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(name)s] %(message)s", datefmt="%H:%M:%S")
    api_log_handler.setFormatter(formatter)
    logging.getLogger().addHandler(api_log_handler)


def get_logs_history() -> List[str]:
    """Mengembalikan daftar log terkini dari buffer memori."""
    return list(recent_logs)


async def sse_log_generator(request: Request) -> AsyncGenerator[dict, None]:
    """
    Generator asinkron untuk Server-Sent Events (SSE).
    Mengalirkan 20 log terakhir saat terhubung, lalu log baru secara live.
    """
    sub_queue: queue.Queue = queue.Queue(maxsize=100)
    with subscribers_lock:
        active_subscribers.append(sub_queue)

    loop = asyncio.get_running_loop()
    try:
        # Kirim 20 log terakhir untuk inisialisasi terminal UI
        for past_log in list(recent_logs)[-20:]:
            yield {"data": json.dumps({"log": past_log})}

        while True:
            if await request.is_disconnected():
                break

            try:
                msg = await loop.run_in_executor(None, sub_queue.get, True, 2.0)
                yield {"data": json.dumps({"log": msg})}
            except queue.Empty:
                continue
    finally:
        with subscribers_lock:
            if sub_queue in active_subscribers:
                active_subscribers.remove(sub_queue)
