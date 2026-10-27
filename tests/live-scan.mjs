// Optional live check: pass a public listing URL. Never runs in the default test suite.
import {networkURL} from './load-ts.mjs';
const {scanLink}=await import(networkURL);
if(!process.argv[2])throw Error('Usage: node tests/live-scan.mjs https://public-job-link');
const r=await scanLink(process.argv[2]);console.log(JSON.stringify({role:r.role,company:r.company,source:r.source,hasNotes:!!r.notes,message:r.message}));if(!r.role)process.exitCode=1;
