"use client";
import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Node,
    Edge
} from "reactflow";
import "reactflow/dist/style.css";
import ObjectView from "./ObjectView";

export default function JSONVisualizer({ data, onClose }: any) {
    const [view, setView] = useState<"raw" | "graph" | "object">("raw");
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const buildGraph = useCallback((json: any, parentId: string | null = null, depth = 0) => {
        if (!json || typeof json !== "object") return { nodes: [], edges: [] };
        const result: Node[] = [];
        let edgeList: Edge[] = [];
        let index = 0;

        Object.entries(json).forEach(([key, value]) => {
            const id = parentId ? `${parentId}-${key}` : key;
            result.push({
                id,
                data: { label: `${key}: ${typeof value === "object" ? "" : value}` },
                position: { x: depth * 250, y: index * 100 },
                style: {
                    background: "#1f2937",
                    color: "#fff",
                    border: "1px solid #4b5563",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 12,
                    width: 220
                }
            });
            if (parentId) {
                edgeList.push({
                    id: `${parentId}-${id}`,
                    source: parentId,
                    target: id,
                    type: "smoothstep"
                });
            }
            if (typeof value === "object") {
                const childGraph = buildGraph(value, id, depth + 1);
                result.push(...childGraph.nodes);
                edgeList.push(...childGraph.edges);
            }
            index++;
        });
        return { nodes: result, edges: edgeList };
    }, []);

    useEffect(() => {
        try {
            const graph = buildGraph(data);
            setNodes(graph.nodes);
            setEdges(graph.edges);
        } catch (err) {
            console.error("Error rendering flow:", err);
        }
    }, [data, buildGraph]);

    const onConnect = useCallback(
        (params: any) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-4 w-[90%] h-[90%] relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-white">JSON Visualizer</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setView("raw")}
                        className={`px-4 py-2 rounded-md transition ${view === "raw"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        Raw JSON
                    </button>
                    <button
                        onClick={() => setView("graph")}
                        className={`px-4 py-2 rounded-md transition ${view === "graph"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        Graph View
                    </button>
                    <button
                        onClick={() => setView("object")}
                        className={`px-4 py-2 rounded-md transition ${view === "object"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        Object View
                    </button>
                </div>

                <div className="w-full h-full rounded-lg border border-gray-700 overflow-hidden">
                    {view === "raw" && (
                        <div className="p-4 h-full overflow-y-auto bg-gray-800">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(data, null, 2)}
                            </pre>
                        </div>
                    )}
                    {view === "graph" && (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            fitView
                        >
                            <MiniMap />
                            <Controls />
                            <Background gap={16} color="#2d2d2d" />
                        </ReactFlow>
                    )}
                    {view === "object" && <ObjectView jsonData={data} />}
                </div>
            </div>
        </div>
    );
}
