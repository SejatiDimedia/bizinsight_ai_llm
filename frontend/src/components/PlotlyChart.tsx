import React, { useEffect, useRef } from 'react';
// @ts-ignore
import Plotly from 'plotly.js-dist-min';

interface PlotlyChartProps {
  chart: any;
  title?: string;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({ chart, title }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !chart) return;

    try {
      const data = chart.data || [];
      const layout = {
        ...(chart.layout || {}),
        autosize: true,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'rgba(15, 23, 42, 0.4)',
        font: { color: '#cbd5e1', family: 'system-ui, sans-serif' },
        margin: { t: 40, r: 24, l: 50, b: 45 },
        xaxis: {
          gridcolor: 'rgba(51, 65, 85, 0.4)',
          zerolinecolor: 'rgba(51, 65, 85, 0.6)',
          ...(chart.layout?.xaxis || {}),
        },
        yaxis: {
          gridcolor: 'rgba(51, 65, 85, 0.4)',
          zerolinecolor: 'rgba(51, 65, 85, 0.6)',
          ...(chart.layout?.yaxis || {}),
        },
      };

      const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      };

      Plotly.newPlot(containerRef.current, data, layout, config as any);
    } catch (e) {
      console.error('Failed to render Plotly chart:', e);
    }

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [chart]);

  if (!chart) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400">
        Tidak ada data visualisasi untuk ditampilkan.
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-sm">
      {title && <h4 className="mb-2 text-sm font-medium text-slate-300">{title}</h4>}
      <div ref={containerRef} className="min-h-[380px] w-full" />
    </div>
  );
};
