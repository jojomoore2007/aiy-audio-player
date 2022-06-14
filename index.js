var siofu = require('socketio-file-upload');
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

const groove = require('groove');

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(siofu.router);
app.use(express.static(path.join(__dirname, 'public')));
var files = [];
var playlist = groove.createPlaylist();
var player = groove.createPlayer();
groove.connectSoundBackend(groove.BACKEND_PULSEAUDIO);
var devices = groove.getDevices();
var defaultDevice = devices.list[devices.defaultIndex];
player.device = defaultDevice;
player.attach(playlist,(err)=>{if (err) throw err});
function playlistPacket() {
  let l = [];
  for (;playlist.count()&&(player.position().item!=playlist.items()[0]);) {
    let item = playlist.items()[0];
    let file = item.file;
    playlist.remove(item);
    file.close();
  }
  let current = player.position();
  for (let item of playlist.items()) {
    let file = item.file;
    let meta = file.metadata();
    meta.filename = file.filename;
    meta.duration = file.duration();
    l.push(meta);
  }
  let meta = null;
  if (current.item) {
    let file = current.item.file;
    let meta = file.metadata();
    meta.filename = file.filename;
    meta.duration = file.duration;
    meta.position = current.pos;
  }
  return {nowPlaying: meta, playlist: l, playing: player.playing()};
}
function timePacket() {
  return {playing: playlist.playing(), position: (player.position().pos)||0};
}
io.on('connection', (socket) => {
  player.on('nowPlaying',()=>{
    let current = player.position();
    if (!current.item) {
      playlist.seek()
    }
    socket.broadcast.emit('playlist', playlistPacket());
  });
  var uploader = new siofu();
  uploader.dir = "/app/audio";
  uploader.listen(socket);
  uploader.on('saved', (event) => {
    groove.open(event.file.name,(err,file) => {
      if (err) {console.log(err); return null;}
      playlist.insert(file);
      socket.broadcast.emit('playlist', playlistPacket());
    });
  })
  socket.on('play', (data) => {
    if (!playlist.playing()) {
      playlist.play();
    }
    socket.broadcast.emit('play', timePacket());
  });
  socket.on('pause', (data) => {
    if (playlist.playing()) {
      playlist.pause();
    }
    socket.broadcast.emit('pause', timePacket())
  });
  socket.on('query', (data) => {
    socket.broadcast.emit('playlist', playlistPacket());
  });
});
