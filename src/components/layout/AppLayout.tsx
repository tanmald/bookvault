import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { CreateLibraryDialog } from '@/components/library/CreateLibraryDialog';
import { JoinLibraryDialog } from '@/components/library/JoinLibraryDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Footer } from '@/components/layout/Footer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  Library as LibraryIcon,
  Users,
  Link2,
  User,
  LogOut,
  Plus,
  Menu,
  X,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { currentLibrary, libraries, setCurrentLibrary } = useLibrary();
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const navItems = [
    { href: '/', label: t('nav.library'), icon: LibraryIcon },
    { href: '/friends', label: t('nav.friends'), icon: Users },
    { href: '/invites', label: t('nav.invites'), icon: Link2 },
  ];
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = user?.email?.substring(0, 2).toUpperCase() ?? 'U';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between overflow-hidden">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-accent" />
              <span className="text-xl font-semibold tracking-tight">BookVault</span>
            </Link>

            {/* Library Selector */}
            {currentLibrary && (
              <Select
                value={currentLibrary.id}
                onValueChange={(value) => {
                  if (value === '__create__') {
                    setShowCreateDialog(true);
                  } else {
                    const lib = libraries.find(l => l.id === value);
                    if (lib) setCurrentLibrary(lib);
                  }
                }}
              >
                <SelectTrigger className="w-48 hidden md:flex">
                  <LibraryIcon className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {libraries.map(lib => (
                    <SelectItem key={lib.id} value={lib.id}>
                      {lib.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="__create__">
                    <Plus className="h-4 w-4 mr-2 inline" />
                    {t('libraries.create')}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary',
                    location.pathname === item.href
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Tablet: Icon only */}
            <div className="hidden sm:flex lg:hidden items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowJoinDialog(true)}
                title={t('libraries.joinButton')}
              >
                <UserPlus className="h-4 w-4" />
              </Button>

              <Button asChild size="icon">
                <Link to="/upload" title={t('nav.addBook')}>
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Desktop: Full buttons with text */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJoinDialog(true)}
              >
                <UserPlus className="h-4 w-4" />
                {t('libraries.joinButton')}
              </Button>

              <Button asChild size="sm">
                <Link to="/upload">
                  <Plus className="h-4 w-4" />
                  {t('nav.addBook')}
                </Link>
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                  aria-label={t('nav.profile')}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url || ''} alt="" />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('nav.profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? t('common.closeMenu') : t('common.openMenu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="border-t md:hidden">
            <div className="container py-4 space-y-1">
              {/* Library Link */}
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary',
                  location.pathname === '/'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <LibraryIcon className="h-4 w-4" />
                {t('nav.library')}
              </Link>

              {/* Library Selector - Mobile */}
              {currentLibrary && libraries.length > 0 && (
                <div className="px-3 py-2 border-b border-border mb-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                    {t('nav.currentLibrary')}
                  </label>
                  <Select
                    value={currentLibrary.id}
                    onValueChange={(value) => {
                      if (value === '__create__') {
                        setShowCreateDialog(true);
                      } else {
                        const lib = libraries.find(l => l.id === value);
                        if (lib) {
                          setCurrentLibrary(lib);
                          setMobileMenuOpen(false);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <LibraryIcon className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {libraries.map(lib => (
                        <SelectItem key={lib.id} value={lib.id}>
                          {lib.name}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value="__create__">
                        <Plus className="h-4 w-4 mr-2 inline" />
                        {t('libraries.create')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Friends Link */}
              <Link
                to="/friends"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary',
                  location.pathname === '/friends'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <Users className="h-4 w-4" />
                {t('nav.friends')}
              </Link>

              {/* Invites Link */}
              <Link
                to="/invites"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary',
                  location.pathname === '/invites'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <Link2 className="h-4 w-4" />
                {t('nav.invites')}
              </Link>

              <Link
                to="/upload"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-accent hover:bg-secondary"
              >
                <Plus className="h-4 w-4" />
                {t('nav.addBook')}
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-6">{children}</main>

      <Footer />

      {/* Dialogs */}
      <CreateLibraryDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <JoinLibraryDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />
    </div>
  );
}
