import test from 'node:test';
import assert from 'node:assert/strict';
import {newProgress,observeCompletion,queueIndex,cleanMusicTitle,spotifyImage} from '../lib/music/playback.ts';
test('queue advances once on a reported finish, never on manual pause, buffering or short previews of a longer item',()=>{
 const progress=newProgress();assert.equal(observeCompletion(progress,{position:0,duration:180000,isPaused:false},false),false);
 assert.equal(observeCompletion(progress,{position:1000,duration:180000,isPaused:false},false),false);
 assert.equal(observeCompletion(progress,{position:30000,duration:180000,isPaused:true},false),false,'a provider preview cutoff is not invented as full completion');
 assert.equal(observeCompletion(progress,{position:180000,duration:180000,isPaused:true},true),false);
 assert.equal(observeCompletion(progress,{position:180000,duration:180000,isPaused:true,isBuffering:true},false),false);
 assert.equal(observeCompletion(progress,{position:180000,duration:180000,isPaused:true},false),true);
 assert.equal(observeCompletion(progress,{position:180000,duration:180000,isPaused:true},false),false,'duplicate completion does not skip a release');
 const fresh=newProgress();assert.equal(observeCompletion(fresh,{position:180000,duration:180000,isPaused:true},false),false,'stale end telemetry cannot finish a new queue item');
 assert.equal(queueIndex(-1,5),4);assert.equal(queueIndex(5,5),0);
});
test('metadata titles drop emoji and artwork only uses HTTPS Spotify image hosts',()=>{
 assert.equal(cleanMusicTitle('LAX! 🌻 ✨'),'LAX!');
 assert.equal(spotifyImage('https://i.scdn.co/image/cover'),'https://i.scdn.co/image/cover');
 assert.equal(spotifyImage('http://i.scdn.co/image/cover'),undefined);
 assert.equal(spotifyImage('https://i.scdn.co.evil.example/cover'),undefined);
 assert.equal(spotifyImage('https://user:secret@i.scdn.co/image/cover'),undefined);
});
