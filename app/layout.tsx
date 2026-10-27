import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Nextstep — Your job search, lighter',description:'A quieter place to move your job search forward. Quick applications, clear next steps.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
