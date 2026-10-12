import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const root=new URL('../public/art/3d/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
assert.ok(manifest.totalBytes<16*1024*1024,'Scanned model package must remain below 16 MiB');
for(const entry of manifest.files){const data=fs.readFileSync(new URL(entry.file,root));assert.equal(data.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256,entry.file);assert.equal(entry.license,'CC0-1.0');
 if(!/\.(gltf|glb)$/.test(entry.file))continue;
 const glb=entry.file.endsWith('.glb'),j=glb?JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12))):JSON.parse(data);
 const sizes=j.buffers.map(b=>b.byteLength);
 for(const v of j.bufferViews)assert.ok((v.byteOffset||0)+v.byteLength<=sizes[v.buffer],entry.file+' buffer bounds');
 for(const resource of [...j.buffers,...j.images])if(resource.uri){assert.ok(!/^(https?:|\/|\.\.)/.test(resource.uri),'Runtime assets must be local');assert.ok(fs.existsSync(new URL(path.posix.join(path.posix.dirname(entry.file),resource.uri),root)),entry.file+' resource '+resource.uri);}
 for(const mesh of j.meshes)for(const p of mesh.primitives)assert.ok(j.accessors[p.indices].count%3===0);
}
console.log(`PASS ${manifest.files.length} licensed asset files: integrity, local dependencies, buffer bounds and download budget`);
