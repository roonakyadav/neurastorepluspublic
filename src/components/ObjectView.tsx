import { JSONTree } from 'react-json-tree';

export default function ObjectView({ jsonData }: { jsonData: any }) {
    return (
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <JSONTree
                data={jsonData}
                hideRoot={false}
                invertTheme={true}
            />
        </div>
    );
}
