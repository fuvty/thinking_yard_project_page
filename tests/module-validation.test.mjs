import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validate} from '../scripts/validate.mjs';
test('Local ES module graphs are syntax-checked without running and validate their relative data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'project-module-check-'));
 try{
  await writeFile(join(dir,'index.html'),'<script type="module" src="./entry.js"></script>');
  await writeFile(join(dir,'entry.js'),'import {value} from "./dependency.js"; throw new Error("must not execute"); const data = new URL("./data.json", import.meta.url);');
  await writeFile(join(dir,'dependency.js'),'export const value = 1;');
  await writeFile(join(dir,'data.json'),'{}');
  await validate(dir);
  await rm(join(dir,'data.json'));
  await assert.rejects(validate(dir),/missing module-relative asset/);
  await writeFile(join(dir,'data.json'),'{}');
  await writeFile(join(dir,'dependency.js'),'export const = ;');
  await assert.rejects(validate(dir),/SyntaxError/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
