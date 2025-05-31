'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Litematic } from '@kleppe/litematic-reader'
import AlertBox from '@/components/AlertBox';
import { parseBlockState } from '@kleppe/litematic-reader/dist/lib/litematic';
import { deflate } from 'pako';

type Vector3 = {
  X: number;
  Y: number;
  Z: number;
};


function getFileNameWithoutExtension(filename: string): string {
  const parts = filename.split('.');
  parts.pop();
  return parts.join('.');
}
function convertBlock(bid: string, baxis: string, bpos: Vector3): Map<string, string> {
  const blockDict = new Map<string, string>([["p", `${bpos.X},${bpos.Y},${bpos.Z}`],["b", bid]]);
  if (baxis == 'x') blockDict.set('r', 'f');
  else if (baxis == 'z') blockDict.set('r', 'l');
  return blockDict;
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
    const data = new Array<object>();
    for (const block of await litematic.getAllBlocks()) {
      const blockState = parseBlockState(block.block);
      const bid = blockState.Name.startsWith('minecraft:') ? blockState.Name.substring(10) : "air";
      if (bid == 'air') continue;
      const btype = blockState.Properties["type"];
      const baxis = blockState.Properties["axis"];
      const bpos: Vector3 = { X: block.pos.x, Y: block.pos.y, Z: block.pos.z };
      if (btype == "double") {
        bpos.Y -= 0.25;
        data.push(Object.fromEntries(convertBlock(bid, baxis, { X: bpos.X, Y: bpos.Y + 0.5, Z: bpos.Z })));
      } else if (btype == "bottom") {
        bpos.Y -= 0.25;
      } else if (btype == "top") {
        bpos.Y += 0.25;
      }
      data.push(Object.fromEntries(convertBlock(bid, baxis, bpos)));
    }
    outDict.set('Data', data);
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
