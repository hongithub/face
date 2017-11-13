
var brfv4Example = {

	appId: "com.tastenkunst.brfv4.js.examples", 

	loader: { queuePreloader: null },	
	imageData: {						
		webcam: { stream: null },		
				
	},
	dom: {},
	
	drawing: {},//绘制顶点 面 三角形 矩形绘制功能的封装
	
	drawing3d: {						
		
		t3d: {}					
		
	},
	stats: {}						
};



var brfv4 = {locateFile: function(fileName) { return "js/libs/brf/BRFv4_JS_trial.js.mem"; }};


brfv4Example.start = function() {

	brfv4Example.loader.preload([
			"js/libs/brf/BRFv4_JS_trial.js",					// BRFv4 SDK----------------------------
			"js/libs/createjs/easeljs-0.8.2.min.js",				// canvas drawing lib  油画图库
			"js/libs/threejs/three.js",								// ThreeJS: a 3D engine  threejs：3D引擎
				"js/utils/BRFv4DOMUtils.js",							// DOM handling DOM处理--------
				"js/utils/BRFv4DrawingUtils_CreateJS.js",				// BRF result drawing BRF效果图
				"js/utils/BRFv4Drawing3DUtils_ThreeJS.js",				// ThreeJS 3d object placement. threejs三维物体的位置
				"js/utils/BRFv4SetupWebcam.js",							// webcam handling 摄像头的处理
				"js/utils/BRFv4SetupExample.js",						// overall example setup 整体设置
			"js/examples/face_tracking/ThreeJS_example.js"//=======
		], function() {
			brfv4Example.init("webcam");
	});
};

//查看打开时追踪时的各个状态console.log();
brfv4Example.trace = function(msg, error) {
	if(typeof window !== 'undefined' && window.console) {
		var now = (window.performance.now() / 1000).toFixed(3);
		if(error) {	window.console.error(now + ': ', msg); }
		else { window.console.log(now + ': ', msg); }
	}
};


//预加载功能的设置
(function () {
	"use strict";

	var loader = brfv4Example.loader;

	loader.preload = function (filesToLoad, callback) {

		if (loader.queuePreloader !== null || !filesToLoad) {
			return;
		}

		function onPreloadProgress(event) {
			loader.setProgressBar(event.loaded, true);
		}

		function onPreloadComplete(event) {
			loader.setProgressBar(1.0, false);
			if(callback) callback();
		}

		var queue = loader.queuePreloader = new createjs.LoadQueue(true);
		queue.on("progress", onPreloadProgress);
		queue.on("complete", onPreloadComplete);
		queue.loadManifest(filesToLoad, true);
	};

	loader.loadExample = function (filesToLoad, callback) {

		function onProgress(event) {
			loader.setProgressBar(event.loaded, true);
		}

		function onComplete(event) {
			loader.setProgressBar(1.0, false);
			if(callback) callback();
		}

		var queue = loader.queueExamples = new createjs.LoadQueue(true);
		queue.on("progress", onProgress);
		queue.on("complete", onComplete);
		queue.loadManifest(filesToLoad, true);
	};

	//预加载时设置的进度条
	loader.setProgressBar = function(percent, visible) {

		var bar = document.getElementById("_progressBar");
		if(!bar) return;

		if(percent < 0.0) percent = 0.0;
		if(percent > 1.0) percent = 1.0;

		var width = Math.round(percent * 640);
		var color = 0xe7e7e7;

		bar.style.width = width + "px";
		bar.style.backgroundColor = "#" + color.toString(16);
		bar.style.display = visible ? "block" : "none";
	};
})();

//DRawing3DUtitls_threejs.js
