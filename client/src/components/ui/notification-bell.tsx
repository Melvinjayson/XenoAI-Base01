import React, { useState } from 'react';
import { Bell, BellRing, Check, Clock, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/context/notification-context';
import { Badge } from '@/components/ui/badge';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll 
  } = useNotifications();

  // Group notifications by day
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const getNotificationsByDate = () => {
    const todayNotifications = notifications.filter(
      n => new Date(n.timestamp).setHours(0, 0, 0, 0) === today
    );
    
    const yesterdayNotifications = notifications.filter(
      n => new Date(n.timestamp).setHours(0, 0, 0, 0) === yesterday.getTime()
    );
    
    const olderNotifications = notifications.filter(
      n => new Date(n.timestamp).setHours(0, 0, 0, 0) < yesterday.getTime()
    );

    return {
      today: todayNotifications,
      yesterday: yesterdayNotifications,
      older: olderNotifications
    };
  };

  const notificationsByDate = getNotificationsByDate();
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'insight':
        return <div className="w-2 h-2 rounded-full bg-blue-500" />;
      case 'research':
        return <div className="w-2 h-2 rounded-full bg-purple-500" />;
      case 'task':
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case 'productivity':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500" />;
    }
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`relative ${className}`}
          onClick={() => setIsOpen(true)}
        >
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="font-medium">Notifications</h3>
          <div className="flex space-x-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={markAllAsRead}
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={clearAll}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-0 h-9 rounded-none">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              Insights
              {notifications.filter(n => n.category === 'insight' && !n.read).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {notifications.filter(n => n.category === 'insight' && !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="research" className="text-xs">
              Research
              {notifications.filter(n => n.category === 'research' && !n.read).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {notifications.filter(n => n.category === 'research' && !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">
              Tasks
              {notifications.filter(n => n.category === 'task' && !n.read).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {notifications.filter(n => n.category === 'task' && !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[300px]">
            <TabsContent value="all" className="m-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mb-2" />
                  <h3 className="text-sm font-medium text-gray-700">No notifications</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    You're all caught up! Notifications will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notificationsByDate.today.length > 0 && (
                    <div>
                      <div className="bg-gray-50 px-4 py-1 text-xs font-medium text-gray-500">Today</div>
                      {notificationsByDate.today.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`flex items-start p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div className="flex-shrink-0 mr-3 mt-1">
                            {getCategoryIcon(notification.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{notification.body}</p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="ml-2 bg-blue-500 rounded-full h-2 w-2 flex-shrink-0"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {notificationsByDate.yesterday.length > 0 && (
                    <div>
                      <div className="bg-gray-50 px-4 py-1 text-xs font-medium text-gray-500">Yesterday</div>
                      {notificationsByDate.yesterday.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`flex items-start p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div className="flex-shrink-0 mr-3 mt-1">
                            {getCategoryIcon(notification.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{notification.body}</p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="ml-2 bg-blue-500 rounded-full h-2 w-2 flex-shrink-0"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {notificationsByDate.older.length > 0 && (
                    <div>
                      <div className="bg-gray-50 px-4 py-1 text-xs font-medium text-gray-500">Older</div>
                      {notificationsByDate.older.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`flex items-start p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div className="flex-shrink-0 mr-3 mt-1">
                            {getCategoryIcon(notification.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{notification.body}</p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="ml-2 bg-blue-500 rounded-full h-2 w-2 flex-shrink-0"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="insights" className="m-0">
              {notifications.filter(n => n.category === 'insight').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mb-2" />
                  <h3 className="text-sm font-medium text-gray-700">No insight notifications</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Insights about your research will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications
                    .filter(n => n.category === 'insight')
                    .map((notification) => (
                      <div 
                        key={notification.id}
                        className={`flex items-start p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex-shrink-0 mr-3 mt-1">
                          {getCategoryIcon(notification.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{notification.body}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="ml-2 bg-blue-500 rounded-full h-2 w-2 flex-shrink-0"></div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="research" className="m-0">
              {notifications.filter(n => n.category === 'research').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mb-2" />
                  <h3 className="text-sm font-medium text-gray-700">No research notifications</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Research updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications
                    .filter(n => n.category === 'research')
                    .map((notification) => (
                      <div 
                        key={notification.id}
                        className={`flex items-start p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex-shrink-0 mr-3 mt-1">
                          {getCategoryIcon(notification.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{notification.body}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="ml-2 bg-blue-500 rounded-full h-2 w-2 flex-shrink-0"></div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="tasks" className="m-0">
              {notifications.filter(n => n.category === 'task').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mb-2" />
                  <h3 className="text-sm font-medium text-gray-700">No task notifications</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Task updates and reminders will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications
                    .filter(n => n.category === 'task')
                    .map((notification) => (
                      <div 
                        key={notification.id}
                        className={`flex items-start p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex-shrink-0 mr-3 mt-1">
                          {getCategoryIcon(notification.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{notification.body}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="ml-2 bg-blue-500 rounded-full h-2 w-2 flex-shrink-0"></div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}