const CACHE='ev-static-v1';
const APP='/ev-ai/';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll([APP,APP+'manifest.json'])).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(r=>r||caches.match(APP))))});
self.addEventListener('push',event=>{
  let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text?.()||'E.V. has a reminder for you.'}}
  const title=data.title||'E.V. // Reminder';
  const options={body:data.body||'You asked E.V. to remind you.',tag:data.tag||'ev-reminder',renotify:true,data:{url:data.url||APP},icon:data.icon||undefined,badge:data.badge||undefined};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url||APP;event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus' in c){c.navigate(url);return c.focus()}}return clients.openWindow(url)}))});
