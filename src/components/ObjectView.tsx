import React, { useState, useEffect } from 'react';
import { JSONTree } from 'react-json-tree';

interface ObjectViewProps {
    jsonData: any;
    onDataChange?: (newData: any) => void;
}

export default function ObjectView({ jsonData, onDataChange }: ObjectViewProps) {
    const [data, setData] = useState(jsonData);

    useEffect(() => {
        setData(jsonData);
    }, [jsonData]);

    const handleDataChange = (newData: any) => {
        setData(newData);
        onDataChange?.(newData);
    };

    return (
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <JSONTree
                data={data}
                hideRoot={false}
                invertTheme={true}
                theme={{
                    base00: '#1e1e1e',
                    base01: '#2a2a2a',
                    base02: '#3a3a3a',
                    base03: '#4a4a4a',
                    base04: '#5a5a5a',
                    base05: '#ffffff',
                    base06: '#ffffff',
                    base07: '#ffffff',
                    base08: '#ff7f7f',
                    base09: '#ffa500',
                    base0A: '#ffff7f',
                    base0B: '#7fff7f',
                    base0C: '#7fffff',
                    base0D: '#b8d4ff',
                    base0E: '#ff7fff',
                    base0F: '#ffffff'
                }}
            />
        </div>
    );
}
