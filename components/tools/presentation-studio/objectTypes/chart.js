'use client';

import SlideChart from '../SlideChart';

export function createDefaults({ chartType = 'bar' } = {}) {
  return { chartType, labels: ['A', 'B', 'C'], values: [1, 2, 3], colors: [] };
}

// Chart data editing (relabeling/re-entering values) is not part of Phase 1
// — move/resize/delete/duplicate cover the spec's "editable where
// practical" bar; a data-editing panel is a reasonable Phase 2 addition.
export function Content({ obj }) {
  return <SlideChart chartType={obj.chartType} labels={obj.labels} values={obj.values} colors={obj.colors} width={400} height={300} />;
}
