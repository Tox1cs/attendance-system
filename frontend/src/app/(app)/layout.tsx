"use client"; 

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { 
  HomeIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  CheckCircleIcon, 
  CalendarDaysIcon, 
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

type NavMenu = {
  name: string;
  href: string;
  icon: React.ElementType;
};

type CollapsibleMenu = {
  name: string;
  icon: React.ElementType;
  key: string;
  basePath: string;
  subLinks: NavMenu[];
};

const mainNavigation: NavMenu[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "My Activity Log", href: "/my-activity", icon: ClockIcon },
];

const requestNavigation: CollapsibleMenu = {
  name: "My Requests",
  icon: DocumentTextIcon,
  key: "requests",
  basePath: "/requests",
  subLinks: [
    { name: "Overtime", href: "/requests/overtime", icon: CalendarDaysIcon },
    { name: "Leave", href: "/requests/leave", icon: CalendarDaysIcon },
  ],
};

const adminNavigation: CollapsibleMenu = {
  name: "Admin",
  icon: Cog6ToothIcon,
  key: "admin",
  basePath: "/management",
  subLinks: [
    { name: "Approve Requests", href: "/management", icon: CheckCircleIcon },
  ],
};

const getInitialMenu = (pathname: string) => {
  if (pathname.startsWith(requestNavigation.basePath)) return requestNavigation.key;
  if (pathname.startsWith(adminNavigation.basePath)) return adminNavigation.key;
  return null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); 
  const [openMenu, setOpenMenu] = useState<string | null>(getInitialMenu(pathname));

  const toggleMenu = (menuKey: string) => {
    setOpenMenu(openMenu === menuKey ? null : menuKey);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/");
  };

  const isMainLinkActive = (href: string) => pathname === href;
  const isChildActive = (href: string) => pathname === href;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      <aside className="flex w-72 flex-shrink-0 flex-col bg-gray-900 text-gray-300 shadow-lg">
        
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-semibold text-white">Attendance Pro</h1>
          </div>
          <nav className="px-4 py-2">
            <ul className="space-y-1">
              {mainNavigation.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    onClick={() => setOpenMenu(null)}
                    className={`
                      ${isMainLinkActive(link.href) 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                      group flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors
                    `}
                  >
                    <link.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {link.name}
                  </Link>
                </li>
              ))}
              
              <li>
                <button 
                  onClick={() => toggleMenu(requestNavigation.key)}
                  className={`
                    ${openMenu === requestNavigation.key 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                    group flex w-full items-center justify-between rounded-md px-4 py-2 text-left text-sm font-medium transition-colors
                  `}
                >
                  <span className="flex items-center">
                    <requestNavigation.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {requestNavigation.name}
                  </span>
                  <ChevronDownIcon 
                     className={`h-5 w-5 transform transition-transform duration-150 ${openMenu === requestNavigation.key ? 'rotate-180' : 'rotate-0'}`} 
                  />
                </button>
                {openMenu === requestNavigation.key && (
                  <ul className="mt-1 space-y-1 pl-9">
                    {requestNavigation.subLinks.map((subLink) => (
                       <li key={subLink.name}>
                         <Link 
                           href={subLink.href}
                           className={`
                             ${isChildActive(subLink.href) 
                               ? 'font-semibold text-white' 
                               : 'font-normal text-gray-400 hover:bg-gray-700 hover:text-white'}
                             group flex items-center rounded-md px-3 py-2 text-sm
                           `}
                         >
                           {subLink.name}
                         </Link>
                       </li>
                    ))}
                  </ul>
                )}
              </li>
              
              <li>
                <button 
                  onClick={() => toggleMenu(adminNavigation.key)}
                  className={`
                    ${openMenu === adminNavigation.key
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                    group flex w-full items-center justify-between rounded-md px-4 py-2 text-left text-sm font-medium transition-colors
                  `}
                >
                   <span className="flex items-center">
                     <adminNavigation.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                     {adminNavigation.name}
                   </span>
                   <ChevronDownIcon 
                     className={`h-5 w-5 transform transition-transform duration-150 ${openMenu === adminNavigation.key ? 'rotate-180' : 'rotate-0'}`} 
                   />
                </button>
                {openMenu === adminNavigation.key && (
                  <ul className="mt-1 space-y-1 pl-9">
                     {adminNavigation.subLinks.map((subLink) => (
                       <li key={subLink.name}>
                         <Link 
                           href={subLink.href}
                           className={`
                             ${isChildActive(subLink.href)
                               ? 'font-semibold text-white' 
                               : 'font-normal text-gray-400 hover:bg-gray-700 hover:text-white'}
                             group flex items-center rounded-md px-3 py-2 text-sm
                           `}
                         >
                           {subLink.name}
                         </Link>
                       </li>
                    ))}
                  </ul>
                )}
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-gray-700 p-4">
            <div className="flex items-center space-x-3 rounded-md p-2">
                 <UserCircleIcon className="h-10 w-10 text-gray-400"/>
                 <div className="flex-1">
                     <span className="block text-sm font-medium text-white">Parsa (Admin)</span>
                     <span className="block text-xs text-gray-400">Test Employee</span>
                 </div>
                 <button 
                   onClick={handleLogout} 
                   title="Log Out" 
                   className="group rounded-md p-2 transition-colors hover:bg-gray-800"
                 >
                    <ArrowRightOnRectangleIcon 
                      className="h-6 w-6 text-gray-400 transition-colors group-hover:text-red-500" 
                    />
                 </button>
            </div>
        </div>

      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}