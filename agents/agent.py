import logging


class Agent:
    """
    Abstract Superclass untuk semua Agen di BizInsight AI.
    Menangani standardisasi format logging dengan kode warna ANSI terminal unik per agen.
    """

    # Foreground ANSI Colors
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"

    # Background color
    BG_BLACK = "\033[40m"

    # Reset code
    RESET = "\033[0m"

    name: str = "Base Agent"
    color: str = WHITE

    def log(self, message: str):
        """
        Mencatat pesan log INFO dengan identitas nama agen dan warna khusus terminal.
        """
        color_code = self.BG_BLACK + self.color
        formatted_message = f"[{self.name}] {message}"
        logging.info(color_code + formatted_message + self.RESET)