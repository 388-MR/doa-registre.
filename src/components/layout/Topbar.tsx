import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { globalSearch, type SearchResult } from '../../services/misc';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { agent, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        const results = await globalSearch(searchQuery);
        setSearchResults(results);
        setIsSearchOpen(true);
      } else {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  return (
    <header className="h-16 bg-dark-950/80 backdrop-blur-md border-b border-dark-800 flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2"
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search */}
        <div ref={searchRef} className="relative hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Recherche globale..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80 bg-dark-800 border border-dark-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-dark-700 rounded">
              /
            </kbd>
          </div>

          {/* Search results dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-600 rounded-lg shadow-elevated max-h-96 overflow-y-auto animate-scale-in">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs text-gray-400">
                    {result.type.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100 truncate">
                      {result.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {result.subtitle || result.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2"
          onClick={() => navigate('/search')}
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* User menu */}
        <div className="relative ml-2">
          <button
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <Avatar
              src={agent?.avatar_url}
              name={agent?.display_name || agent?.matricule}
              size="sm"
            />
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-gray-100">
                {agent?.display_name || agent?.matricule}
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
