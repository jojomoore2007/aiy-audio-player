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
io.on('connection', (socket) => {
  player.on('nowPlaying',()=>{
    let current = player.position();
    if (!current.item) {
      playlist.clear()
      for (let file of files) {
        file.close()
      }
      return;
    }
    var artist = current.item.file.getMetadata('artist');
    var title = current.item.file.getMetadata('title');
    
  })
  var uploader = new siofu();
  uploader.dir = "/app/audio";
  uploader.listen(socket);
  uploader.on('saved', (event) => {
    groove.open(event.file,(err,file) => {
      if (err) {console.log(err);return null;}
      files.push(file)
      playlist.insert(files[files.length-1])
    })
  })
  socket.on('play', (data) => {
    if (!playing) {
      playlist.play();
    }
    playing = true;
    socket.broadcast.emit('play', {
      
    });
  });
});
