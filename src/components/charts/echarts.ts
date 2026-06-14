import { BarChart, HeatmapChart, LineChart, PieChart, ScatterChart, SankeyChart } from "echarts/charts";
import { CalendarComponent, DataZoomComponent, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

/**
 * Single tree-shaken ECharts registration point. Imported once by BaseChart
 * so echarts only loads with chart-bearing routes, never on the upload page.
 */
use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  SankeyChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  CalendarComponent,
  MarkLineComponent,
  CanvasRenderer,
]);
