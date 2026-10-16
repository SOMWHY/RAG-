"use client";

import { clsx } from "clsx";
import { Maximize2, Minus, Plus } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildMindmapTree, type Mindmap, type MindmapNode } from "@/lib/schema/mindmap";

const H_GAP = 205;
const V_GAP = 46;
const NODE_H = 40;
const PADDING = 20;
const WIDTH_BY_DEPTH = [180, 165, 150];

type LaidNode = {
  id: string;
  label: string;
  weight?: number;
  depth: number;
  x: number;
  y: number;
  hasChildren: boolean;
};
type LaidEdge = { from: LaidNode; to: LaidNode };

function nodeWidth(depth: number): number {
  return WIDTH_BY_DEPTH[Math.min(depth, WIDTH_BY_DEPTH.length - 1)];
}

/** 简易整齐树布局：深度决定 x，叶子按序遍历决定 y，父节点居中于子节点 */
function layout(root: MindmapNode, collapsed: Set<string>) {
  const nodes: LaidNode[] = [];
  const edges: LaidEdge[] = [];
  let cursorY = 0;

  const visit = (node: MindmapNode, depth: number): LaidNode => {
    const x = depth * H_GAP;
    const childrenVisible = !collapsed.has(node.id) && node.children.length > 0;

    let laid: LaidNode;
    if (!childrenVisible) {
      laid = {
        id: node.id,
        label: node.label,
        weight: node.weight,
        depth,
        x,
        y: cursorY,
        hasChildren: node.children.length > 0,
      };
      cursorY += V_GAP;
      nodes.push(laid);
      return laid;
    }

    const childNodes = node.children.map((child) => visit(child, depth + 1));
    laid = {
      id: node.id,
      label: node.label,
      weight: node.weight,
      depth,
      x,
      y: (childNodes[0].y + childNodes[childNodes.length - 1].y) / 2,
      hasChildren: true,
    };
    nodes.push(laid);
    for (const child of childNodes) edges.push({ from: laid, to: child });
    return laid;
  };

  visit(root, 0);

  const width = Math.max(...nodes.map((node) => node.x + nodeWidth(node.depth))) + PADDING * 2;
  const height = Math.max(...nodes.map((node) => node.y)) + NODE_H + PADDING * 2;
  return { nodes, edges, width, height };
}

const FILL_STYLES = [
  "fill-brand-500/30 stroke-brand-400",
  "fill-brand-500/15 stroke-brand-400/50",
  "fill-accent-cyan/10 stroke-accent-cyan/40",
];
const TEXT_STYLES = ["text-ink-100", "text-ink-200", "text-ink-300"];

interface MindmapViewProps {
  mindmap: Mindmap;
}

export function MindmapView({ mindmap }: MindmapViewProps) {
  const root = useMemo(() => buildMindmapTree(mindmap), [mindmap]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 滚轮缩放需非 passive 监听才能 preventDefault
  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((prev) => Math.min(2, Math.max(0.4, prev - event.deltaY * 0.0015)));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  if (!root) {
    return (
      <p className="rounded-xl border border-dashed border-white/12 p-5 text-center text-xs text-ink-500">
        导图数据结构异常，请重新生成
      </p>
    );
  }

  const { nodes, edges, width, height } = layout(root, collapsed);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.ox + (event.clientX - drag.x),
      y: drag.oy + (event.clientY - drag.y),
    });
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="scrollbar-slim h-[380px] cursor-grab overflow-auto rounded-xl border border-white/10 bg-ink-950/50 active:cursor-grabbing"
      >
        <svg width={width} height={height} className="block">
          <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
            {edges.map((edge) => {
              const x1 = edge.from.x + nodeWidth(edge.from.depth) + PADDING;
              const y1 = edge.from.y + NODE_H / 2 + PADDING;
              const x2 = edge.to.x + PADDING;
              const y2 = edge.to.y + NODE_H / 2 + PADDING;
              return (
                <path
                  key={`${edge.from.id}-${edge.to.id}`}
                  d={`M ${x1} ${y1} C ${x1 + 45} ${y1}, ${x2 - 45} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  className="stroke-brand-400/40"
                  strokeWidth={1.5}
                />
              );
            })}

            {nodes.map((node) => {
              const w = nodeWidth(node.depth);
              const styleIndex = Math.min(node.depth, FILL_STYLES.length - 1);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x + PADDING} ${node.y + PADDING})`}
                  onClick={() => node.hasChildren && toggle(node.id)}
                  className={clsx(node.hasChildren && "cursor-pointer")}
                >
                  <rect
                    width={w}
                    height={NODE_H}
                    rx={10}
                    strokeWidth={1}
                    className={clsx(
                      FILL_STYLES[styleIndex],
                      "transition-opacity duration-150 hover:opacity-85",
                    )}
                  />
                  <foreignObject width={w} height={NODE_H}>
                    <div className="flex h-full items-center gap-1 px-2.5">
                      <span
                        className={clsx(
                          "truncate text-[11px] leading-tight",
                          TEXT_STYLES[styleIndex],
                          (node.weight ?? 3) >= 4 && "font-semibold",
                        )}
                      >
                        {node.label}
                      </span>
                      {node.hasChildren && (
                        <span className="ml-auto shrink-0 text-[10px] text-ink-500">
                          {collapsed.has(node.id) ? "+" : "−"}
                        </span>
                      )}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-ink-500">
        <span>点击节点折叠 · 拖拽平移 · 滚轮缩放</span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((prev) => Math.max(0.4, prev - 0.15))}
            className="rounded p-1 transition hover:bg-white/8 hover:text-ink-200"
            title="缩小"
          >
            <Minus className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => setScale((prev) => Math.min(2, prev + 0.15))}
            className="rounded p-1 transition hover:bg-white/8 hover:text-ink-200"
            title="放大"
          >
            <Plus className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="rounded p-1 transition hover:bg-white/8 hover:text-ink-200"
            title="重置视图"
          >
            <Maximize2 className="size-3" />
          </button>
        </span>
      </div>
    </div>
  );
}
