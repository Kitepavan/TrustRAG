const pptxgen = require('pptxgenjs');
const p = new pptxgen();
p.layout = 'LAYOUT_WIDE';
p.author = 'TrustRAG'; p.subject = 'Academic secure retrieval-augmented generation prototype'; p.title = 'TrustRAG — Secure Retrieval-Augmented Generation'; p.company = 'TrustRAG'; p.lang = 'en-US';
p.theme = {headFontFace:'Arial', bodyFontFace:'Arial', lang:'en-US'};
const C={ink:'102D2C',bg:'F3F7F6',teal:'007D70',mint:'70E1C0',gray:'526663',white:'FFFFFF',line:'D8E4E0',red:'B13B45',amber:'9A6400'};
const out='/home/pavan/TrustRAG/TrustRAG_Academic_2026.pptx';
const icons='/home/pavan/TrustRAG/ppt_assets/icons/';
function text(s,t,x,y,w,h,size=18,color=C.ink,bold=false,extra={}){s.addText(t,{x,y,w,h,fontFace:'Arial',fontSize:size,color,bold,margin:0,breakLine:false,vertAlign:'mid',...extra});}
function box(s,x,y,w,h,fill=C.white,line=fill){s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:0.12,radius:0.12,fill:{color:fill},line:{color:line,width:1}});}
function icon(s,name,x,y,color='teal',size=.45){s.addImage({path:icons+name+'-'+color+'.png',x,y,w:size,h:size});}
function slide(k,title,sub,dark=false){const s=p.addSlide();s.background={color:dark?C.ink:C.bg};text(s,k.toUpperCase(),.6,.38,11,.25,11,dark?C.mint:C.teal,true,{charSpacing:1.5});if(title)text(s,title,.6,.95,12.1,.7,34,dark?C.white:C.ink,true);if(sub)text(s,sub,.6,1.8,11.9,.65,17,dark?'C6DCD6':C.gray);text(s,'TrustRAG  /  Academic prototype  /  17 Sep 2026',.6,7.02,10,.2,10,dark?'B7D1C8':C.gray);text(s,String(p._slides.length).padStart(2,'0'),12.05,6.98,.65,.3,11,dark?C.mint:C.teal,true,{align:'right'});return s;}
function note(s,t,src='PROJECT_REPORT.md'){s.addNotes(t+'\n\nSource: '+src+' (local project documentation, current status September 17, 2026).');}
function card(s,x,y,w,h,ic,title,body,color='teal'){box(s,x,y,w,h);icon(s,ic,x+.25,y+.25,color);text(s,title,x+.25,y+.9,w-.5,.65,21,C.ink,true);text(s,body,x+.25,y+1.7,w-.5,h-1.9,17,C.gray);}
function arrow(s,x,y,w=.35){s.addShape(p.ShapeType.chevron,{x,y,w,h:.28,fill:{color:C.teal},line:{color:C.teal}});}
// 01
{
const s=slide('Secure retrieval-augmented generation','','',true);
text(s,'TrustRAG',.65,1.5,8,1.05, 60,C.white,true);
text(s,'Make retrieval a security decision.',.7,2.78,8.6,.7,30,C.mint,true);
text(s,'Authenticity, integrity, trust and authorization\nbefore private documents reach an LLM.',.7,3.78,8.2,1.1,24,'D1E4DE');
box(s,10,1.85,2.65,3.6,'1A403C');icon(s,'shield',10.7,2.22,'teal',1.25);text(s,'VERIFY\nFILTER\nTHEN GENERATE',10.22,3.8,2.21,1.1,19,C.white,true,{align:'center'});
text(s,'“The most semantically relevant document\nis not necessarily the safest document.”',.7,5.62,10.8,.8,22,C.white,false,{italic:true});
note(s,'TrustRAG is an academic information security engineering project. It augments an existing RAG pipeline; it does not train an LLM. Stages 1–11 are implemented, while Stage 12 currently supplies synthetic component checks rather than a completed end-to-end security experiment.');
}
// 02
{
const s=slide('01 / Motivation','Similarity is not a security guarantee','A naive RAG pipeline can retrieve relevant text that should never become answer context.');
card(s,.6,2.8,3.84,3.55,'file','Knowledge poisoning','Misleading document content can distort a generated answer.','red');
card(s,4.74,2.8,3.84,3.55,'alert','Prompt injection','Instructions embedded in retrieved text can compete with the intended task.','amber');
card(s,8.88,2.8,3.84,3.55,'lock','Tampering & access','Modified files or restricted documents can cross an unprotected retrieval path.','teal');
note(s,'These are threat classes motivating the design, not a claim that every RAG system has no controls. TrustRAG focuses on candidate eligibility before generation. Content scanning uses demonstration heuristics and does not establish universal protection.');
}
// 03
{
const s=slide('02 / Design principle','Relevant is necessary. Eligible comes first.','Secure retrieval combines hard policy checks with trust-aware ranking.');
const rows=[['01','Authenticity & integrity','Check current file evidence and signed bytes.'],['02','Authorization & content','Enforce classification, quarantine and content checks.'],['03','Trust-aware relevance','Rank Trusted before Suspicious; then use distance.']];
rows.forEach((r,i)=>{const y=2.75+i*1.13;box(s,.6,y,8.05,.92);text(s,r[0],.85,y+.2,.55,.4,23,C.teal,true);text(s,r[1],1.6,y+.14,6.7,.32,20,C.ink,true);text(s,r[2],1.6,y+.53,6.7,.25,15,C.gray);});
box(s,8.98,2.75,3.74,3.65,C.ink);icon(s,'filter',10.34,3.1,'teal',.85);text(s,'Only eligible context\nreaches generation',9.3,4.23,3.1,1,25,C.white,true,{align:'center'});text(s,'Provenance records history;\nit is not a separate access gate.',9.3,5.6,3.1,.5,14,'CCE0D8',false,{align:'center'});
note(s,'Hard rejection and ranking are distinct: quarantine and authorization decide eligibility; trust category and cosine distance order survivors. Mutable JSON provenance is traceability metadata, not a cryptographic or per-query authorization proof.');
}
// 04
{
const s=slide('03 / Architecture','Local retrieval, external generation','Security checks are integrated into both ingestion and query processing.');
const stages=[['layers','React interface','7 authenticated pages'],['code','FastAPI backend','JWT • RBAC • orchestration'],['shield','Secure RAG core','Ingest • verify • retrieve']];
stages.forEach((a,i)=>{const x=.6+i*4.14;box(s,x,2.75,3.84,1.65);icon(s,a[0],x+.22,3);text(s,a[1],x+.85,2.98,2.72,.4,22,C.ink,true);text(s,a[2],x+.25,3.65,3.3,.4,16,C.gray);if(i<2)arrow(s,x+3.88,3.42,.22);});
box(s,.6,4.9,7.97,1.63);icon(s,'database',.88,5.16);text(s,'Local data & models',1.6,5.13,6.5,.4,22,C.ink,true);text(s,'EmbeddingGemma-300M · 768 dimensions · ChromaDB\nFiles + metadata · Ed25519 keys · provenance · SQLite audit',.9,5.72,7.25,.57,16,C.gray);
box(s,8.88,4.9,3.84,1.63,'E2EFEB');icon(s,'chat',9.15,5.14);text(s,'OpenRouter LLM',9.8,5.1,2.7,.45,21,C.ink,true);text(s,'The prompt and eligible document\ncontext leave the local system.',9.15,5.76,3.27,.53,16,C.gray);
note(s,'Backend: Python 3.12, FastAPI, Uvicorn. Frontend: React 19, strict TypeScript, Vite and Tailwind v4. Embeddings run locally using SentenceTransformers with EmbeddingGemma-300M. Default configured generation model: nvidia/nemotron-3.5-lightning:free via OpenRouter. Local embedding does not mean document text never leaves the system: selected context is sent to the external provider.');
}
// 05
{
const s=slide('04 / Ingestion','Build security evidence before indexing','PDF, DOCX and TXT enter an authenticated, classification-aware ingestion path.');
const items=[['1','Validate','Type, size and clearance;\nserver-generated document ID.'],['2','Verify','SHA-256 file digest;\nEd25519 when signed.'],['3','Extract & scan','Read text; scan for injection\nand poisoning patterns.'],['4','Assign trust','Trusted, Suspicious\nor Quarantined.'],['5','Chunk & embed','512-character target, 64 overlap;\nlocal 768-dimensional vectors.'],['6','Persist evidence','File/chunk digests, classification,\ntrust metadata and provenance.']];
items.forEach((a,i)=>{const x=.6+(i%3)*4.14,y=2.75+Math.floor(i/3)*1.92;box(s,x,y,3.84,1.62);box(s,x+.22,y+.22,.48,.48,'E2EFEB');text(s,a[0],x+.22,y+.24,.48,.4,18,C.teal,true,{align:'center'});text(s,a[1],x+.87,y+.22,2.72,.5,21,C.ink,true);text(s,a[2],x+.24,y+.89,3.36,.55,16,C.gray);});
note(s,'The copy cap is 50 MB and applies after multipart parsing; deployment still needs a request-body limit. Extracted text is capped at two million characters after extraction. Chunks target 512 characters with 64-character overlap, not tokens; a long sentence can exceed the target. Unsigned clean files are not rejected merely because they lack a signature: they become Suspicious. Stores are not a single transactional database.');
}
// 06
{
const s=slide('05 / Trust policy','Three categories. Explicit outcomes.','Trust is a policy classification—not a calibrated probability of safety.');
const a=[['Trusted','Valid signature\n+ clean scans','Eligible; ranked first',C.teal,'E1F2EA','check'],['Suspicious','Unsigned\n+ clean scans','Eligible; ranked lower',C.amber,'FFF1D8','alert'],['Quarantined','Invalid signature OR\npositive content scan','Blocked from secure context',C.red,'F9E6E8','lock']];
a.forEach((r,i)=>{let x=.6+4.14*i;box(s,x,2.85,3.84,3.47,r[4]);icon(s,r[5],x+.3,3.15,i===0?'teal':i===1?'amber':'red',.55);text(s,r[0],x+.3,3.94,3.24,.5,27,r[3],true);text(s,r[1],x+.3,4.73,3.24,.66,20,C.ink);text(s,r[2],x+.3,5.68,3.24,.32,15,r[3],true);});
note(s,'Positive injection or poisoning scans quarantine content even when its signature is valid. Signature authenticity is not a guarantee of factual correctness or benign intent. Missing required authoritative evidence fails closed at secure retrieval; legacy records need re-ingestion.');
}
// 07
{
const s=slide('06 / Query-time enforcement','Recheck evidence at retrieval time','Ingestion-time labels alone are not enough: stored content can change.');
const rr=[['01','Retrieve candidates','Embed query and fetch up to 3 × top-K from ChromaDB.'],['02','Validate document evidence','Check authoritative records, current file digests and signatures.'],['03','Enforce eligibility','Apply classification and quarantine; verify chunk digests; rescan content.'],['04','Rank & generate','Trusted first, then distance. Send eligible context to the LLM.']];
rr.forEach((r,i)=>{let y=2.7+i*.91;box(s,.6,y,11.05,.72);text(s,r[0],.85,y+.15,.55,.4,23,C.teal,true);text(s,r[1],1.62,y+.14,3.28,.43,19,C.ink,true);text(s,r[2],5.05,y+.12,6.3,.46,16,C.gray);});
icon(s,'shield',12.04,3.93,'teal',.55);text(s,'Changed evidence can persist quarantine across metadata, vectors and provenance.',.85,6.52,11.4,.28,15,C.teal,true);
note(s,'Secure retrieval checks current file/signature evidence and individual chunk digests, not just vector metadata. Quarantine propagates to metadata, ChromaDB and provenance. Bounded oversampling may underfill top-K. The intentionally unfiltered baseline remains restricted to Admin/IT_Security at both API and shared retrieval layers. Context instructions and delimiters are mitigations, not a hard prompt-injection boundary.');
}
// 08
{
const s=slide('07 / Authentication & authorization','Access control spans the full workflow','Authorization is enforced server-side, not only by hiding controls in the interface.');
box(s,.6,2.8,5.85,3.7);icon(s,'user',.9,3.1);text(s,'Four role profiles',1.6,3.1,4.4,.45,24,C.ink,true);
['Employee','HR','IT_Security','Admin'].forEach((r,i)=>{let x=.9+(i%2)*2.63,y=4+Math.floor(i/2)*.93;box(s,x,y,2.33,.62,'E5F0EC');text(s,r,x+.15,y+.12,2.03,.35,19,C.teal,true);});
const rs=[['Authenticated access','Data, dashboard, status, evaluation and query APIs require JWTs.'],['Classification enforcement','Uploads, listings, details and secure retrieval respect clearance.'],['Privileged operations','Unfiltered baseline and audit event access: Admin / IT_Security.']];
rs.forEach((r,i)=>{let y=2.88+i*1.2;text(s,r[0],6.88,y,5.5,.42,22,C.ink,true);text(s,r[1],6.88,y+.49,5.42,.58,17,C.gray);});
note(s,'Authentication uses HS256 JWTs and environment-configured scrypt password hashes. Fixed demo passwords require explicit demo mode and are disabled by default. Health and login remain public. Tokens live in sessionStorage; sign-out or 401 unmounts account-specific state. sessionStorage does not defend against same-origin script compromise. Signatures authenticate file bytes, not uploader-selected classification.');
}
// 09
{
const s=slide('08 / Interface & traceability','Expose decisions—not just answers','A seven-page React interface connects document management, query context and security telemetry.');
const pages=['Dashboard','Documents','Chat','Evaluation','Audit Log','Knowledge Base','Status'];
pages.forEach((r,i)=>{const x=.6+(i%2)*2.64,y=2.75+Math.floor(i/2)*.83;box(s,x,y,2.34,.61);text(s,r,x+.19,y+.13,1.96,.33,17,C.ink,true);});
box(s,6.25,2.75,6.47,3.78,C.ink);icon(s,'eye',6.58,3.07,'teal',.5);text(s,'Upload / query event traces',7.3,3.03,4.95,.5,23,C.white,true);text(s,'Request ID, outcome, stages and duration\nPrivileged event filters and expandable traces\nCurrent call sites omit prompts, text and secrets',6.6,3.99,5.8,1.38,19,'D3E5DF',{paraSpaceAfter:12});text(s,'SQLite audit and JSON provenance are mutable;\nneither is cryptographically tamper-evident.',6.6,5.77,5.75,.52,16,C.mint,true);
note(s,'This slide is a feature map, not a live UI screenshot or a browser acceptance claim. Telemetry is best-effort; write failures do not bypass enforcement. It is not a complete access/login audit trail. The audit API supports cursor pagination; the current UI indicates an older-event cursor without loading older pages. Audit access is Admin/IT_Security-only.');
}
// 10
{
const s=slide('09 / Verification','Implemented controls, bounded evidence','Reported verification from the project handoff on 17 September 2026—not a new run for this deck.');
box(s,.6,2.8,3.2,3.7,C.ink);text(s,'67',.92,3.09,2.5,1.15,68,C.mint,true);text(s,'automated tests passed',.94,4.43,2.52,.68,24,C.white,true);text(s,'1 deprecation warning\nFrontend build + lint passed',.94,5.57,2.53,.55,15,'D3E5DF');
text(s,'Four synthetic component scenarios',4.2,2.91,8.3,.48,25,C.ink,true);
const cases=['Cryptographic tampering','Indirect prompt injection','Knowledge poisoning','RBAC authorization'];cases.forEach((r,i)=>{const x=4.2+(i%2)*4.34,y=3.72+Math.floor(i/2)*.84;box(s,x,y,4.03,.63);icon(s,'check',x+.15,y+.16,'teal',.27);text(s,r,x+.61,y+.15,3.25,.33,17,C.ink);});
box(s,4.2,5.57,8.52,.93,'FFF1D8');text(s,'Not an end-to-end attack-success benchmark.\nSuite runtime is not measured secure-RAG latency overhead.',4.47,5.74,7.99,.57,18,C.amber,true);
note(s,'Source verification reports 67 passed and one Starlette TestClient/httpx deprecation warning; TypeScript/Vite build and lint passed. No live OpenRouter request is required by this test suite. The four fixed component scenarios include real Ed25519 verification and RBAC filtering, but baseline outcomes are unfiltered-control assumptions. Do not present their percentages as universal protection rates or their suite_duration_ms as RAG latency overhead. No new tests, provider experiment or browser acceptance test was performed for this presentation.');
}
// 11
{
const s=slide('10 / Limitations & research','What the prototype does not prove','Security claims must stay within the threat model and the evidence collected.');
const list=[['Heuristic detection','Regex checks can miss adversarial content or flag benign text.','Held-out corpus; false-positive / false-negative analysis.'],['Trusted storage & operators','Administrators, metadata storage and configured keys remain trusted.','Key lifecycle, reconciliation and stronger audit integrity.'],['External processing','Eligible document context goes to OpenRouter.','Explicit egress policy and approved data handling.'],['Unmeasured end-to-end behavior','Retrieval quality, answer quality and security overhead remain open.','Controlled baseline comparison with measured outcomes.']];
list.forEach((r,i)=>{let y=2.65+i*.96;box(s,.6,y,12.12,.8);text(s,r[0],.83,y+.13,3.23,.52,18,C.ink,true);text(s,r[1],4.24,y+.11,4.13,.58,15,C.gray);text(s,r[2],8.72,y+.11,3.7,.58,15,C.teal);});
text(s,'Production hardening also needs TLS, request/rate limits, quotas, identity lifecycle and backups.',.83,6.67,11.8,.25,14,C.gray);
note(s,'Future work is not represented as implemented. Prompt delimiters are not a hard security boundary. Plain hashes cannot protect against a trusted administrator rewriting both content and expected digests. There is no automatic key rotation/version history. File, vector and provenance stores are not transactional together. Baseline-vs-secure latency, attack success and utility should be measured on a held-out dataset under controlled experimental conditions.');
}
// 12
{
const s=slide('Conclusion','Trust before generation.','',true);
text(s,'TrustRAG turns retrieval from a similarity lookup\ninto a verified, policy-aware selection process.',.65,2.15,10.8,1.1,30,C.white,true);
const a=[['shield','Verify evidence'],['lock','Enforce access'],['filter','Filter & rank']];a.forEach((r,i)=>{const x=.65+i*4.15;box(s,x,3.89,3.8,1.49,'1A403C');icon(s,r[0],x+.3,4.23,'teal',.5);text(s,r[1],x+.99,4.19,2.51,.59,23,C.white,true);});
text(s,'Working academic prototype.\nBroader security and utility claims still require measured experiments.',.7,5.91,10.35,.75,21,C.mint);
note(s,'Closing takeaway: authenticity, integrity, authorization and content policy matter alongside semantic relevance. The contribution is an implemented defense-in-depth retrieval prototype with component verification, not a universal prompt-injection defense. Primary references: PROJECT_REPORT.md, AGENTS.md and README.md in the TrustRAG repository, status September 17, 2026.');
}
p.writeFile({fileName:out});
