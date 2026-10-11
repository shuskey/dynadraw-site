import { CornerUpLeft, CornerUpRight, CornerLeftUp, CornerLeftDown, RotateCw, RotateCcw, PencilLine } from 'lucide-react';
import { ObjectThumbnail } from './ObjectChooser';
import { isExtension, type Action } from './engine';

export default function Glyph({ item, size = 20 }: { item: Pick<Action, 'kind' | 'axis' | 'value' | 'color' | 'model'>; size?: number }) {
  if (item.kind === 'object') return <ObjectThumbnail model={item.model || 'rocket'} color={item.color} size={size}/>;
  if (item.kind === 'draw') return <PencilLine size={size} strokeWidth={1.8}/>;
  if (item.kind === 'color') return <span className="color-dot" style={{ background: item.color, width: size, height: size }}/>;
  if (isExtension(item.kind)) return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6L12 2L16 6"/><path d="M12 2V22" strokeDasharray={item.kind === 'move' ? '2 4' : undefined}/></svg>;
  const Icon = item.kind === 'spin' ? RotateCw : item.axis === 'x' ? (item.value < 0 ? CornerLeftDown : CornerLeftUp) : item.axis === 'y' ? (item.value < 0 ? RotateCw : RotateCcw) : item.value < 0 ? CornerUpRight : CornerUpLeft;
  return <Icon size={size} strokeWidth={1.8}/>;
}
