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

// Routing
app.use(express.static(path.join(__dirname, 'public')));
var playing = false;
var files = [];
var playlist = groove.createPlaylist();
var player = groove.createPlayer();
groove.connectSoundBackend(groove.BACKEND_PULSEAUDIO);
var devices = groove.getDevices();
var defaultDevice = devices.list[devices.defaultIndex];
player.device = defaultDevice;
player.attach(playlist,(err)=>{if (err) throw err});
function updatePacket() {
  let current = player.position();
  let l = [];
  for (let item of playlist.items()) {
    let file = item.file;
    let meta = file.metadata();
    meta.filename = file.filename;
    meta.duration = file.duration();
    l.push(meta)
  }
  let meta = {title:"Playlist Empty"}
  if (current.item) {
    let meta = 
  let file = current.item.file;
  let meta = file.metadata();
  meta.filename = file.filename;
  meta.duration = file.duration;
  meta.position = current.pos;
  return {nowPlaying: meta, playlist: l, playing: player.playing()};
}
io.on('connection', (socket) => {
  player.on('nowPlaying',()=>{
    let current = player.position();
    if (!current.item) {
      playlist.clear()
      for (let file of files) {
        file.close()
      }
    }
    socket.broadcast.emit('update',updatePacket())
  });
  var uploader = new siofu();
  uploader.dir = "/app/audio";
  uploader.listen(socket);
  uploader.on('saved', (event) => {
    groove.open(event.file,(err,file) => {
      if (err) {console.log(err); return null;}
      files.push(file);
      playlist.insert(file);
      let l = []
      for (let item of playlist.items()) {
        l.push([item.file.filename,item.file.metadata()])
      }
      socket.broadcast.emit('updateList',{});
    });
  })
  socket.on('play', (data) => {
    if (!playlist.playing) {
      playlist.play();
    }
    socket.broadcast.emit('play', {
      
    });
  });
});
