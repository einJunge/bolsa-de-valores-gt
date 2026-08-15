/* auth.js - Email + Password version */
var Auth=(function(){"use strict";
var client=null,currentSession=null,listeners=[];
function isEnabled(){return !!(SUPABASE_CONFIG.url&&SUPABASE_CONFIG.anonKey);}
function getClient(){
 if(!isEnabled()) return null;
 if(!client){
   if(!window.supabase||!window.supabase.createClient) throw new Error("No se pudo cargar Supabase.");
   client=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey);
 }
 return client;
}
function signUp(email,password){
 return getClient().auth.signUp({email:email,password:password}).then(function(res){
   if(res.error) throw res.error;
   return res.data.user;
 });
}
function signIn(email,password){
 return getClient().auth.signInWithPassword({email:email,password:password}).then(function(res){
   if(res.error) throw res.error;
   currentSession=res.data.session;
   return res.data.user;
 });
}
function resetPassword(email){
 return getClient().auth.resetPasswordForEmail(email);
}
function signOut(){
 return getClient().auth.signOut().then(function(){currentSession=null;});
}
function getCurrentUser(){return currentSession?currentSession.user:null;}
function init(onChange){
 if(!isEnabled()){onChange(null);return Promise.resolve(null);}
 var c=getClient();
 listeners.push(onChange);
 c.auth.onAuthStateChange(function(e,s){
   currentSession=s;
   listeners.forEach(function(fn){fn(s?s.user:null);});
 });
 return c.auth.getSession().then(function(res){
   currentSession=res.data.session;
   var u=currentSession?currentSession.user:null;
   onChange(u);
   return u;
 });
}
return{isEnabled:isEnabled,getClient:getClient,signUp:signUp,signIn:signIn,resetPassword:resetPassword,signOut:signOut,getCurrentUser:getCurrentUser,init:init};
})();