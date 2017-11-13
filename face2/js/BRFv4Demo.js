//
// Namespace: brfv4Example structures these examples.
//命名空间：brfv4example结构这些例子。

var brfv4Example = {

	appId: "com.tastenkunst.brfv4.js.examples", // Choose your own app id. 8 chars minimum.选择自己的应用程序ID 8字符最小值。

	loader: { queuePreloader: null },	// preloading/example loading 预压/加载-------------
	imageData: {						// image data source handling 数据源处理
		webcam: { stream: null },		// either webcam ...无论是摄像头
		// picture: {}						// ... or pictures/images 照片/图片
	},
	dom: {},//---------------------
								// html dom stuff
	// gui: {},
	//绘制							// QuickSettings elements //快速设置元素
	drawing: {},
	//3d绘制						// drawing the results using createJS 使用CreateJS绘制结果
	drawing3d: {						// all 3D engine functions 所有3D引擎功能 //支持处理的库为
										//"js/utils/BRFv4Drawing3DUtils_ThreeJS.js",
		t3d: {}//,						// ThreeJS stuff
		//f3d: {}						// Flare3D stuff (coming later)
	},
	stats: {}							// fps meter
};

//
// Namespace: brfv4 is the (mandatory) namespace for the BRFv4 library.
//命名空间：brfv4是（强制性）的brfv4库命名空间。

var brfv4 = {locateFile: function(fileName) { return "js/libs/brf/BRFv4_JS_trial.js.mem"; }};

//
// Demo entry point: preloading js files.演示入口，预加载preloading js
//

brfv4Example.start = function() {

	brfv4Example.loader.preload([

		"js/libs/brf/BRFv4_JS_trial.js",					// BRFv4 SDK-----------------------------

			// "https://webrtc.github.io/adapter/adapter-latest.js",	// webcam polyfill for older browsers 摄像头polyfill旧的浏览器

			"js/libs/quicksettings/quicksettings.min.css",			// gui elements GUI元素
			"js/libs/quicksettings/quicksettings.js",

			"js/libs/highlight/highlight_tomorrow.css",				// code highlighter 代码高亮显示
			"js/libs/highlight/highlight.pack.js",

			"js/libs/createjs/easeljs-0.8.2.min.js",				// canvas drawing lib  油画图库
			"js/libs/threejs/three.js",								// ThreeJS: a 3D engine  threejs：3D引擎

			"js/utils/BRFv4DOMUtils.js",							// DOM handling DOM处理--------
			"js/utils/BRFv4Stats.js",								// FPS meter FPS 的侦测-----------------------

			"js/utils/BRFv4DrawingUtils_CreateJS.js",				// BRF result drawing BRF效果图---------------------
			"js/utils/BRFv4Drawing3DUtils_ThreeJS.js",				// ThreeJS 3d object placement. threejs三维物体的位置----------------

			"js/utils/BRFv4SetupWebcam.js",							// webcam handling 摄像头的处理-----------------
			// "js/utils/BRFv4SetupPicture.js",						// picture/image handling 图像/图像的行为--------------
			"js/utils/BRFv4SetupExample.js",						// overall example setup 整体设置示例---------------------

			"js/utils/BRFv4PointUtils.js",							// some calculation helpers 一些参与计算的帮手-------------------

			// "js/utils/BRFv4SetupChooser.js",						// gui: choose either webcam or picture //选择摄像头和图片----------------
			// "js/utils/BRFv4ExampleChooser.js",						// gui: choose an example 选择一个例子---------------
			// "js/utils/BRFv4DownloadChooser.js",						// gui: choose which package to download 选择要下载的包-------------

			// example to load on startup, others can be chosen via the example chooser GUI.
			// 实例启动时加载，也可以选择通过实例选择界面。

			// "js/examples/face_tracking/track_single_face.js"		// 从这个例子开始
			"js/examples/face_tracking/ThreeJS_example.js"		// 从这个例子开始--------------------------------

		], function() {

			brfv4Example.init("webcam");

	});
};

//
// Helper stuff: logging and loading
	//辅助工具：日志和加载

	// Custom way to write to a log/error to console.
	//自定义写入日志/错误到控制台的方法
brfv4Example.trace = function(msg, error) {
	if(typeof window !== 'undefined' && window.console) {
		var now = (window.performance.now() / 1000).toFixed(3);
		if(error) {	window.console.error(now + ': ', msg); }
		else { window.console.log(now + ': ', msg); }
	}
};

// loading of javascript files:加载javascript文件：
	//
	// preload(filesToLoad, callback) // filesToLoad (array)
	// loadExample(filesToLoad, callback) // filesToLoad (array)
	// setProgressBar(percent, visible)

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