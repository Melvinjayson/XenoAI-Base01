import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  MoreVertical, 
  MessageSquare, 
  Check, 
  X, 
  EyeOff,
  Clock,
  Copy,
  Share2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface User {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  status: 'online' | 'idle' | 'offline';
  color: string;
  cursor?: { x: number; y: number };
  viewingArea?: { x: number; y: number; width: number; height: number };
}

interface CollaborativeUsersPanelProps {
  canvasId: string | number;
  onInviteUser?: (email: string) => void;
  onCopyInviteLink?: () => void;
  onExportCanvas?: () => void;
  onUserClick?: (userId: string) => void;
}

const CollaborativeUsersPanel: React.FC<CollaborativeUsersPanelProps> = ({
  canvasId,
  onInviteUser,
  onCopyInviteLink,
  onExportCanvas,
  onUserClick,
}) => {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink] = useState(`https://example.com/canvas/${canvasId}?invite=12345`);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  
  // Sample users for demonstration
  const [users] = useState<User[]>([
    {
      id: 'u1',
      name: 'You',
      initials: 'YO',
      status: 'online',
      color: '#6B4BFF',
      cursor: { x: 100, y: 100 }
    },
    {
      id: 'u2',
      name: 'Alex Johnson',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      initials: 'AJ',
      status: 'online',
      color: '#00C2FF',
      cursor: { x: 250, y: 320 },
      viewingArea: { x: 200, y: 300, width: 400, height: 300 }
    },
    {
      id: 'u3',
      name: 'Maria Garcia',
      initials: 'MG',
      status: 'idle',
      color: '#FF5757',
      viewingArea: { x: 100, y: 100, width: 300, height: 200 }
    },
    {
      id: 'u4',
      name: 'Sam Taylor',
      initials: 'ST',
      status: 'offline',
      color: '#22C55E'
    }
  ]);
  
  // Sample chat messages
  const [chatMessages] = useState([
    { id: 'm1', userId: 'u2', name: 'Alex Johnson', message: "I've added some notes on the research findings", time: '10:32 AM' },
    { id: 'm2', userId: 'u1', name: 'You', message: "Great! I'll connect them to the main concept", time: '10:35 AM' },
    { id: 'm3', userId: 'u3', name: 'Maria Garcia', message: 'Should we add a section about user feedback?', time: '10:42 AM' }
  ]);
  
  // Handle inviting a user
  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    
    if (onInviteUser) {
      onInviteUser(inviteEmail);
    }
    
    setInviteEmail('');
    setIsInviting(false);
  };
  
  // Handle copying the invite link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    if (onCopyInviteLink) {
      onCopyInviteLink();
    }
  };
  
  // Handle sending a chat message
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    
    // In a real app, we would send this to other users
    console.log('Sending message:', chatMessage);
    
    setChatMessage('');
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-amber-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };
  
  return (
    <motion.div 
      className="absolute bottom-4 left-4 z-20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Collapsible 
        open={!isCollapsed} 
        onOpenChange={setIsCollapsed}
        className="bg-white rounded-lg shadow-lg border border-gray-200 w-64 overflow-hidden"
      >
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium">Collaborators ({users.length})</h3>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent>
          <Separator />
          
          {/* Users list */}
          <ScrollArea className="max-h-60">
            <div className="p-2 space-y-1">
              {users.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 cursor-pointer"
                  onClick={() => onUserClick?.(user.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-8 w-8" style={{ borderColor: user.color }}>
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} alt={user.name} />
                        ) : null}
                        <AvatarFallback style={{ backgroundColor: `${user.color}20`, color: user.color }}>
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      {user.status === 'idle' && (
                        <p className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-0.5" /> Away
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>User actions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <Separator />
          
          {/* Invite section */}
          <div className="p-2">
            {isInviting ? (
              <div className="flex gap-1 items-center">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className="text-xs h-8"
                  autoFocus
                />
                <Button size="icon" className="h-8 w-8" onClick={handleInvite}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsInviting(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs w-full"
                  onClick={() => setIsInviting(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Invite
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7">
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs">Share Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={handleCopyLink}>
                      <Copy className="h-3 w-3 mr-2" />
                      Copy invite link
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={onExportCanvas}>
                      <Share2 className="h-3 w-3 mr-2" />
                      Export canvas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Chat panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="absolute top-[-380px] left-0 w-64 h-[350px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '350px' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="p-3 flex items-center justify-between border-b border-gray-200">
              <h3 className="text-sm font-medium">Chat</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsChatOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-3">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`max-w-[85%] ${msg.userId === 'u1' ? 'ml-auto' : ''}`}>
                    {msg.userId !== 'u1' && (
                      <p className="text-xs font-medium text-gray-600 mb-1">{msg.name}</p>
                    )}
                    <div className={`p-2 rounded-lg text-xs ${
                      msg.userId === 'u1' 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100'
                    }`}>
                      {msg.message}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{msg.time}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-2 border-t border-gray-200 flex gap-2">
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="text-xs h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button size="icon" className="h-8 w-8" onClick={handleSendMessage} disabled={!chatMessage.trim()}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CollaborativeUsersPanel;