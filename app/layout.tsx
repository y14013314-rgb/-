import type {Metadata} from 'next';
export const metadata:Metadata={title:'SUKHA · Private China Journeys',description:'Thoughtfully designed private journeys across China.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
