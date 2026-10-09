import { Bell, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearAuthSession } from "@/lib/authSession";
import { disconnectInvoiceDraftSocket } from "@/lib/invoiceDraftSocket";

export interface inventoryUser {
  id: string,
  password: string,
  role: string,
  username: string,
}

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate()
  const [inventoryUser, setInventoryUser] = useState<inventoryUser>()

  useEffect(()=>{
    const temUser = JSON.parse(localStorage.getItem("InventoryUser") || "null");
    setInventoryUser(temUser)
  },[])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>

        <div className="min-w-0 flex-1 md:mr-4 md:flex">
          <div className="flex min-w-0 items-center">
            <h1 className="flex min-w-0 items-center gap-1.5 text-base font-extrabold sm:text-xl">
              <span className="shrink-0 bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Daher-Net
              </span>
              <span className="truncate text-sm font-semibold text-gray-700 dark:text-gray-300 sm:text-base">
                / {inventoryUser?.username}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end">
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
            {/*<ThemeToggle />*/}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/placeholder.svg" alt="@user" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {inventoryUser?.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    clearAuthSession();
                    disconnectInvoiceDraftSocket();
                    navigate("/login");
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
