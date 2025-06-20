'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Litematic } from '@kleppe/litematic-reader'
import AlertBox from '@/components/AlertBox';
import { parseBlockState, SchematicReader } from '@kleppe/litematic-reader/dist/lib/litematic';
import { deflate } from 'pako';
import { TileEntityData } from './TileEntityData';

type Vector3 = {
  X: number;
  Y: number;
  Z: number;
};

const idMap: Map<string, string> = new Map([
  ["grass", "air"],
  ["grass_block", "grass"],
]);

const rotationMap: Map<(bid: string) => boolean, (brotation: number) => number> = new Map([
  [(bid: string) => bid.endsWith('sign'), (brotation: number) => brotation > 0 ? 16 - brotation : 0]
]);


function getFileNameWithoutExtension(filename: string): string {
  const parts = filename.split('.');
  parts.pop();
  return parts.join('.');
}
function convertBlock(paletteIndex: number, bpos: Vector3, extraData: Map<string, string | number>): Map<string, string | number> {
  const blockDict = new Map<string, string | number>([["p", `${bpos.X},${bpos.Y},${bpos.Z}`], ["l", paletteIndex+1]]);
  for (const [key, value] of extraData.entries()) {
    blockDict.set(key, value);
  }
  return blockDict;
}
function calculateRotation(bid: string, baxis: string | undefined, bfacing: string | undefined, brotation: number | undefined): number | string | undefined {
  if (baxis == 'x') return 'l';
  if (baxis == 'z') return 'f';
  if (bfacing == 'north') return 0;
  if (bfacing == 'south') return 2;
  if (bfacing == 'east') return 1;
  if (bfacing == 'west') return 3;
  if (brotation !== undefined) {
    for (const [condition, transform] of rotationMap) {
      if (condition(bid)) {
        return transform(brotation);
      }
    }
    return brotation;
  }
  return undefined;
}
function convertPalette(bid: string, baxis: string | undefined, bfacing: string | undefined, brotation: number | undefined): Map<string, string | number> {
  const blockDict = new Map<string, string | number>([["b", bid]]);
  const rotation = calculateRotation(bid, baxis, bfacing, brotation);
  if (rotation !== undefined) blockDict.set('r', rotation);
  return blockDict;
}
function findPalette(palette: Array<object>, bid: string, baxis: string | undefined, bfacing: string | undefined, brotation: number | undefined): number {
  const rotation = calculateRotation(bid, baxis, bfacing, brotation);
  for (let i = 0; i < palette.length; i++) {
    const block = palette[i] as Record<string, string | number | undefined>;
    if (block.b == bid && block.r == rotation) {
      return i;
    }
  }
  return -1;
}

export default function Home() {
  const [fileContent, setFileContent] = useState<ArrayBuffer>();
  const [fileName, setFileName] = useState('');
  const [output, setOutput] = useState('');
  const [alert, setAlert] = useState<{ message: string; type?: 'error' | 'warning' | 'success'; mode?: 'normal' | 'popup' | 'bottom' } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file == undefined) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileContent(reader.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const validator = (file: File) => {
    if (file.name != undefined && !file.name.endsWith('.litematic')) {
      setAlert({
        message: 'File must be a .litematic file',
        type: 'error',
        mode: 'bottom',
      });
      return {
        code: 'file-invalid-type',
        message: 'File must be a .litematic file',
      };
    }
    return null;
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/octet-stream': ['.litematic'] },
    validator: validator,
    multiple: false
  });

  const handleConvert = async () => {
    const litematic = new Litematic(fileContent as ArrayBuffer);
    const outDict = new Map<string, string | object>();
    await litematic.read();
    let name = litematic.litematic?.name ? litematic.litematic?.name : getFileNameWithoutExtension(fileName);
    if (name.length > 30) {
      setAlert({
        message: 'The name is too long, it will be trimmed to 30 characters.',
        type: 'warning',
        mode: 'bottom',
      });
      console.warn("The name is too long, it will be trimmed");
      name = name.substring(0, 30);
    }
    outDict.set('Name', name);
    const tileEntityData = new TileEntityData(litematic.litematic as SchematicReader);
    const data = new Array<object>();
    const palette = new Array<object>();
    for (const block of await litematic.getAllBlocks()) {
      const blockState = parseBlockState(block.block);
      let bid = blockState.Name.startsWith('minecraft:') ? blockState.Name.substring(10) : "air";
      if (idMap.has(bid)) {
        bid = idMap.get(bid) as string;
      }
      if (bid == 'air') continue;
      const btype = blockState.Properties["type"] as string | undefined;
      const baxis = blockState.Properties["axis"] as string | undefined;
      const bfacing = blockState.Properties["facing"] as string | undefined;
      const brotationStr = blockState.Properties["rotation"] as string | undefined;
      const brotation = brotationStr ? Number.parseInt(brotationStr) : undefined;
      const bpos: Vector3 = { X: block.pos.x, Y: block.pos.y, Z: block.pos.z };
      const extraData = new Map<string, string | number>();
      if (bid.endsWith('sign')) {
        const tileEntity = tileEntityData.getTileEntityByPosition(bpos.X, bpos.Y, bpos.Z);
        if (tileEntity !== undefined) {
          const tileEntityId = tileEntity.id;
          if (tileEntityId == "minecraft:sign") {
            const frontText = tileEntity.tileEntityData['front_text'] as {[key: string]: unknown} | undefined;
            if (frontText !== undefined) {
              const messages = frontText['messages'] as Array<string> | undefined;
              if (messages !== undefined && messages.length > 0) {
                const text = messages.map(msg => msg.substring(1, msg.length - 1)).filter(msg => msg.length > 0).join('\n');
                extraData.set('S', text);
              }
            }
          }
        }
      }
      if (btype == "double") {
        bpos.Y -= 0.25;
        let paletteIndex = findPalette(palette, bid, baxis, bfacing, brotation);
        if (paletteIndex == -1) {
          palette.push(Object.fromEntries(convertPalette(bid, baxis, bfacing, brotation)));
          paletteIndex = palette.length - 1;
        }
        data.push(Object.fromEntries(convertBlock(paletteIndex, { X: bpos.X, Y: bpos.Y + 0.5, Z: bpos.Z }, extraData)));
      } else if (btype == "bottom") {
        bpos.Y -= 0.25;
      } else if (btype == "top") {
        bpos.Y += 0.25;
      }
      let paletteIndex = findPalette(palette, bid, baxis, bfacing, brotation);
      if (paletteIndex == -1) {
        palette.push(Object.fromEntries(convertPalette(bid, baxis, bfacing, brotation)));
        paletteIndex = palette.length - 1;
      }
      data.push(Object.fromEntries(convertBlock(paletteIndex, bpos, extraData)));
    }
    outDict.set('Data', data);
    outDict.set('Palette', palette);
    const output = JSON.stringify(Object.fromEntries(outDict));
    const maxSize = 200000;
    if (output.length > maxSize) {
      setAlert({
        message: 'The output sandmatic is too large, please try a smaller schematic.',
        type: 'error',
        mode: 'popup',
      });
      console.error('The output sandmatic is too large, please try a smaller schematic');
      return;
    }
    const compressed = deflate(output);
    const binaryString = Array.from(compressed)
      .map(byte => String.fromCharCode(byte))
      .join('');
    const compressedB64 = btoa(binaryString);
    if (compressedB64.length > 50000) {
      setAlert({
        message: 'The output sandmatic is too large, please try a smaller schematic.',
        type: 'error',
        mode: 'popup',
      });
      console.error('The output sandmatic is too large, please try a smaller schematic');
      return;
    }
    setOutput(compressedB64);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setAlert({
      message: 'Output copied to clipboard!',
      type: 'success',
      mode: 'bottom',
    })
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center text-blue-400 drop-shadow-lg">
          Litematic Converter
        </h1>
        
        <p className="text-center text-gray-300">
          A website to convert litematica schematics to sandmatic schematics for the roblox game Sandbox Madness.
          <br/>
          <a href="https://modrinth.com/mod/litematica" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://modrinth.com/mod/litematica</a>
          <br/>
          <a href="https://www.roblox.com/games/106482760794604/BETA-Sandbox-Madness" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://www.roblox.com/games/106482760794604/BETA-Sandbox-Madness</a>
        </p>

        <div
          {...getRootProps()}
          className={`border-4 border-dashed rounded-xl p-10 text-center transition-colors duration-300 cursor-pointer
            ${isDragActive
              ? 'border-blue-500 bg-blue-500/20 text-blue-700'
              : fileName
              ? 'border-green-500 bg-green-500/20 text-green-700'
              : 'border-gray-300 text-gray-500 bg-gray-500/10'}
          `}
        >
          <input {...getInputProps()} accept=".litematic"/>
          <p className="text-lg">
            {isDragActive
              ? 'Drop the .litematic file here...'
              : fileName
              ? 'Selected file: ' + fileName
              : 'Drag and drop a .litematic file here, or click to select'}
          </p>
        </div>

        <button
          onClick={handleConvert}
          className="w-full py-3 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 transition font-semibold shadow-lg"
        >
          Convert
        </button>

        {output && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-md space-y-4">
            <h2 className="text-xl font-semibold text-blue-300">Output Preview</h2>
            <pre className="whitespace-pre-wrap text-sm bg-gray-900 p-4 rounded-md overflow-auto max-h-64">
              {output}
            </pre>
            <button
              onClick={handleCopy}
              className="py-2 px-4 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium transition"
            >
              Copy to Clipboard
            </button>
          </div>
        )}
        {alert && (
          <AlertBox
            message={alert.message}
            type={alert.type}
            mode={alert.mode}
            onClose={() => setAlert(null)}
          />
        )}
      </div>
    </main>
  );
}
