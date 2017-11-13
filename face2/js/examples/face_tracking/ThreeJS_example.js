(function exampleCode() {
	"use strict";

	var t3d = brfv4Example.drawing3d.t3d;
	var numFacesToTrack = 2;

	function loadModels() {

		if(t3d) {

			// Remove all models and load new ones.

			t3d.removeAll();
			// t3d.loadOcclusionHead("assets/brfv4_occlusion_head.json", numFacesToTrack);
			t3d.loadModel("assets/brfv4_model.json", numFacesToTrack);
		}
	}

	brfv4Example.initCurrentExample = function(brfManager, resolution) {

		brfManager.init(resolution, resolution, brfv4Example.appId);
		brfManager.setNumFacesToTrack(numFacesToTrack);

		// 放松开始条件，最终找到更多的面孔。

		var maxFaceSize = resolution.height;

		if(resolution.width < resolution.height) {
			maxFaceSize = resolution.width;
		}

		brfManager.setFaceDetectionParams(maxFaceSize * 0.20, maxFaceSize * 1.00, 12, 8);
		brfManager.setFaceTrackingStartParams(maxFaceSize * 0.20, maxFaceSize * 1.00, 32, 35, 32);
		brfManager.setFaceTrackingResetParams(maxFaceSize * 0.15, maxFaceSize * 1.00, 40, 55, 32);

		loadModels();
	};

	brfv4Example.updateCurrentExample = function(brfManager, imageData, draw) {

		brfManager.update(imageData);

		if(t3d) t3d.hideAll(); // 隐藏三维模型。只在跟踪的脸上显示它们

		draw.clear();

		var faces = brfManager.getFaces();
		for(var i = 0; i < faces.length; i++) {

			var face = faces[i];
			
			if(face.state === brfv4.BRFState.FACE_TRACKING) {
				if(t3d) t3d.update(i, face, true);
			}
		}

		if(t3d) { t3d.render(); }
	};

	
})();