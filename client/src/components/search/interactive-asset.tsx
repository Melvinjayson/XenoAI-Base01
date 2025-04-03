import React from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type AssetType = 'image' | 'chart' | 'table' | 'code';

export interface AssetData {
  type: AssetType;
  title?: string;
  content: any; // The content varies by type
}

interface InteractiveAssetProps {
  assets: AssetData[];
  className?: string;
}

export function InteractiveAsset({ assets, className }: InteractiveAssetProps) {
  if (assets.length === 0) {
    return null;
  }

  if (assets.length === 1) {
    return (
      <div className={cn("border rounded-xl overflow-hidden mt-4 mb-4", className)}>
        <div className="p-2 bg-gray-50 border-b">
          <h3 className="text-sm font-medium">{assets[0].title || 'Asset'}</h3>
        </div>
        <div className="p-4">
          <AssetContent asset={assets[0]} />
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue={`asset-0`} className={cn("border rounded-xl overflow-hidden mt-4 mb-4", className)}>
      <div className="p-2 bg-gray-50 border-b">
        <TabsList className="grid grid-flow-col auto-cols-fr">
          {assets.map((asset, index) => (
            <TabsTrigger key={index} value={`asset-${index}`} className="text-xs">
              {asset.title || `Asset ${index + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {assets.map((asset, index) => (
        <TabsContent key={index} value={`asset-${index}`} className="p-4 focus:outline-none">
          <AssetContent asset={asset} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function AssetContent({ asset }: { asset: AssetData }) {
  switch (asset.type) {
    case 'image':
      return <ImageAsset url={asset.content} />;
    case 'chart':
      return <ChartAsset data={asset.content} />;
    case 'table':
      return <TableAsset data={asset.content} />;
    case 'code':
      return <CodeAsset code={asset.content} />;
    default:
      return <div className="text-sm text-gray-600">Unsupported asset type</div>;
  }
}

function ImageAsset({ url }: { url: string }) {
  return (
    <div className="flex justify-center">
      <img src={url} alt="Content visual" className="max-w-full h-auto max-h-96 rounded" />
    </div>
  );
}

function ChartAsset({ data }: { data: any[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#6B4BFF" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableAsset({ data }: { data: { headers: string[], rows: any[][] } }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {data.headers.map((header, index) => (
            <TableHead key={index}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <TableCell key={cellIndex}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CodeAsset({ code }: { code: string }) {
  return (
    <pre className="bg-gray-800 text-gray-200 p-4 rounded overflow-x-auto text-xs">
      <code>{code}</code>
    </pre>
  );
}