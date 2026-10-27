export const CATEGORIES=['General','Behavioural','Technical','Case study','Career & motivation','Questions to ask'];
export type InterviewEntry={id:string;question:string;category:string;kind:'Preparation'|'Past interview';company:string;role:string;applicationId:string;interviewDate:string;plannedAnswer:string;actualAnswer:string;improvedAnswer:string;reflection:string;tags:string;starred:boolean;confidence:'To practise'|'Getting there'|'Ready';updated:string};
export function validateInterview(x:unknown):x is InterviewEntry {
 if(!x||typeof x!=='object')return false;const a=x as InterviewEntry;
 return typeof a.id==='string'&&a.id.length>0&&a.id.length<100&&typeof a.question==='string'&&a.question.trim().length>0&&a.question.length<=1000&&CATEGORIES.includes(a.category)&&['Preparation','Past interview'].includes(a.kind)&&['To practise','Getting there','Ready'].includes(a.confidence)&&typeof a.starred==='boolean'&&['company','role','applicationId','interviewDate','plannedAnswer','actualAnswer','improvedAnswer','reflection','tags','updated'].every(k=>typeof a[k as keyof InterviewEntry]==='string')&&JSON.stringify(a).length<=45000;
}
