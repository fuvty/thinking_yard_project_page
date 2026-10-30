import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './generate.mjs';
import { pathToFileURL } from 'node:url';
export async function createProject(slug, name, category, destination = root) {
const root = destination;
const projectsPath=resolve(root,'config/projects.json');
const projects=JSON.parse(await readFile(projectsPath,'utf8'));
const categories=JSON.parse(await readFile(resolve(root,'config/categories.json'),'utf8'));
if(!slug||!name||!category||!/^[a-z][a-z0-9-]*$/.test(slug)||!categories.some(c=>c.id===category)){
 throw new Error('Usage: npm run new:project -- my-project "My Project" compression|adaptivity|context');
}
const directory=resolve(root,'projects',slug);
if(projects.some(p=>p.slug===slug)||await access(directory).then(()=>true,()=>false))throw new Error(`Project already exists: ${slug}`);
const e=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await mkdir(resolve(directory,'static/css'),{recursive:true});
await mkdir(resolve(directory,'static/js'),{recursive:true});
await writeFile(resolve(directory,'page.json'),JSON.stringify({title:`${name} | NICS-EFC`,description:`Research project: ${name}`,theme:'research',sections:[{id:'overview',label:'Overview',group:'research',description:'Research context and core idea'},{id:'method',label:'Method',group:'research',description:'Approach and architecture'},{id:'results',label:'Results',group:'evaluation',description:'Benchmarks and analysis'},{id:'team',label:'Team',group:'resources',description:'Authors and affiliations'},{id:'bibtex',label:'Citation',group:'resources',description:'Paper reference and BibTeX'}]},null,2)+'\n');
await writeFile(resolve(directory,'citation.bib'),`@misc{${slug.replaceAll('-','')},\n  title={${name}}\n}\n`);
await writeFile(resolve(directory,'head.html'),'<link rel="stylesheet" href="./static/css/index.css">\n<script defer src="./static/js/index.js"></script>\n');
await writeFile(resolve(directory,'static/css/index.css'),'/* Project-specific overrides. Shared primitives live in shared/styles/. */\n.hero-subtitle { max-width: 680px; margin-top: 24px; }\n');
await writeFile(resolve(directory,'static/js/index.js'),'// Project-specific interactions. Shared navigation needs no setup here.\n');
await writeFile(resolve(directory,'content.html'),`<section class="hero"><h1 class="hero-title"><span>${e(name)}</span></h1><p class="hero-subtitle">Research project from NICS-EFC.</p></section>
<section class="section" id="overview"><div class="container"><p class="section-eyebrow">Overview</p><h2 class="section-title">${e(name)}</h2></div></section>
<section class="section section-dark" id="method"><div class="container"><p class="section-eyebrow">Method</p><h2 class="section-title">Method</h2></div></section>
<section class="section" id="results"><div class="container"><p class="section-eyebrow">Experiments</p><h2 class="section-title">Results</h2></div></section>
<section class="section section-gray sp-authors" id="team"><div class="container"><p class="section-eyebrow">Team</p><h2 class="section-title">Meet the researchers.</h2></div></section>
<section class="section" id="bibtex"><div class="container"><p class="section-eyebrow">Citation</p><h2 class="section-title">Cite our work.</h2>{{citation}}</div></section>\n`);
projects.push({slug,name,category,route:category==='context'?'03':'02',description:`Research project: ${name}`,logo:'shared/assets/project-placeholder.svg'});
await writeFile(projectsPath,JSON.stringify(projects,null,2)+'\n');
console.log(`Created projects/${slug}/ and registered it in config/projects.json. Edit its content, description, logo, and route before publishing.`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) await createProject(...process.argv.slice(2));
