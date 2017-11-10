# face
人脸识别BMFv4的文档使用
1.BRFManager 
2.BRFFace

一：控制流程;
control flow:
1.初始化init(Rectangle,imageDateSize,Rectangle imageRoi,String appld): void;
  数据类型rectangle==矩形：
        string==字符串
  参数设置：
  imageDate：图像数据大小==>格式（0，0,640,480）对于640x480分辨率的照相机
   imageRoi：在imageDataSize 中你要分析的区域
   对于640x480分辨率的相机，您需要将roi设置为与imageDataSize：Rectangle（0，0，640，480）相同的尺寸。但也许你想限制它的中心，例如。矩形（80,0,480,480），这将限制分析区域从xStart = 80到xEnd = 80 + 480 = 560。
   
2.更新位图：update(Bitmap imageData):void;
  功能：做跟踪工作；在三个BRFMode中的任何一个中运行；
  需要在更新之前自行更新imageData
  可以检索结果：
  getAllDetectedFaces():Vector<rectangle>;
  getMergedDetectedFaces()Vector<rectangle>;
  getFaces():Vector<BRFFace>;
 
3.重置：reset() :void；
所有面部追踪器重置并通过执行面部检测重新开始。所有的点跟踪点都被删除。
4.获取模型：getMode(): String;
返回当前设置的BRFMode。
5.设置模型：setMode(String mode):void
设置BRFMode的三种模式之一：
模式：
a.BRFMode.FACE_DETECTION:此模式只会执行人脸检测的部分，并跳过详细分析；
b.BMFMode.FACE_TRACKING:这是人脸跟踪的常用模式，他执行人脸检测以查找人脸，然后详细跟踪人脸特征
c.BMFMode.POINT_TRACKING:此模式将跳过人脸检测和跟踪，只执行点跟踪。你可以通过选择FACE_TRACKING作为模式同时执行面部跟踪和点跟踪；
二：面部检测：
1.设置面部检测的参数项：
setFaceDetectionParams(minWidth,maxWidth,stepSize,minMergeNeighbors);
参数基准参考480px;
minWidth:查找起始或最小面部大小；以像素为单位；
maxWidth:查找结束或最大面部大小；
stepSize:最小步长是12，必须为12的倍数，通过这个的增加可以跳过检测图层，达到脸部检测不太准确，但执行速度更快；
minMergeNeighbors:蓝色数量，把它们全部合并成一个检测到的脸（显示黄色）
2.setFaceDetectionRoi(roi);设置感兴趣的区域：roi（长方形）
图像中的矩形区域。
3.getAllDetectedFaces（）：Vector <Rectangle>
返回上次更新期间检测到的所有候选人脸（蓝色）。
4.getMergedDetectedFaces（）：Vector <Rectangle>
返回上次更新调用的所有实际合并/检测到的面孔（黄色）。

三,面部跟踪：
1.setNumFacesToTrack（int numFaces）：void
设置追踪的面数（面孔数）；默认单面追踪为1
2.setFaceTrackingStartParams（double minWidth，double maxWidth，double rx，double ry，double rz）：void
控制拾取脸部的条件参数设置：
注：保持minWidth和maxWidth值与面部检测setFaceDetectionParams（）中设置的参数大致相同。
minWidth:必须拾起面部的最小尺寸；
maxWidth:可以拾取一张脸的最大尺寸；
rx:围绕x轴旋转的角度；(俯仰==向上、向下翻转头)
ry:围绕y轴旋转的角度；（偏航-==头部向左向右转动）
rz:围绕z轴转动（滚动、倾斜头向左向右）
3.面部跟踪的重置条件设置：
setFaceTrackingResetParams（double minWidth，double maxWidth，double rx，double ry，double rz）：void
通过设置这些参数，您可以控制重置人脸跟踪的条件。如果脸部比minWidth小或大于maxWidth，或者头部比rx，ry或rz多，跟踪将重置。
4.getFaces（）：Vector <BRFFace>返回当前跟踪的面的列表。

四：点跟踪；
1.setOpticalFlowParams（patchSize，numLevels，numIterations，double error）：void
光流是一种点跟踪算法。它被用于BRFv4来稳定快速运动。您可以通过设置BRFMode.POINT_TRACKING来独立执行此点跟踪，或者通过设置其他两种模式中的任何一种来并行执行此跟踪。
patchSize；奇数，用来比较新图像的点周围的区域，较大的值会降低性能。较低的值会降低准确性，21是一个很好的默认值；
numLevels:等级数量设置；1,2,3，或4这几个值；
numlterations:执行搜索的最大迭代次数；
error:通常小于0.0001；


2.addOpticalFlowPoints(Vector <Point> pointArray);
添加新点以跟踪：应该在调用update（）之前同步完成
pointArray(vector<Point>)：要添加到光流跟踪的点列表；
3.返回BRF是否会检查点的有效性：
getOpticalFlowCheckPointsValidBeforeTracking(); 布尔值；
4.setOpticalFlowCheckPointsValidBeforeTracking（布尔值）：void
设置BRF是否检查点的有效性。在连续的点跟踪中，会有点不能被跟踪
5.返回当前跟踪的点：getOpticalFlowPoints()
6.getOpticalFlowPointStates()
返回所有当前跟踪点的状态

第二章：BMFFace
BMFFace:拥有关于被跟踪的脸部的所有信息；
属性：
lastState:string: 在调用update之前，此面孔的最后一个状态
state:此面目前的状态,任何一个BRF状态
对应的四种状态：
    a.BRFState.RESET
      由于调用重置或因为它超过重置参数，此面被重置。
    b. BRFState.FACE_DETECTION
      BRFv4正在寻找一张脸，仍然没有发现。
    c.BRFState.FACE_TRACKING_START
      BRFv4找到了一张脸，并尝试将脸部跟踪与所识别的脸部对齐。在这种状态下，Candide3模型和3D位置可能不正确。
    d.BRFState.FACE_TRACKING
      BRFv4对齐脸部，现在正在追踪它。
nextState:
vertices:顶点 的【x,y,x,y,......x,y】表示的顶点列表：共有68个顶点，68对xy坐标
获取某个顶点的位置：
var vx = vertices[index*2]//index是例如27的鼻子；
var vy =vy = vertices [index * 2 + 1];

triangles:三角形的连接形成；
顶点可以连接，三角形可以形成。
这是三角形的顶点索引列表，其形式如下：[i0，i1，i2，i0，i1，i2，...，i0，i1，i2]其中3个指标跨越一个三角形。
points:点形式列表为
  但是以[{x，y}，{x，y}，...，{x，y}]形式表示的点的列表，因此长度为：68 
  获取某个点的位置如： 
  var px = points [index] .x; //索引是例如 27的鼻子。
  var py = points [index] .y;
bounds:边界
所有顶点的轮廓矩形
refRect:
这是人脸跟踪算法用于执行跟踪的参考矩形。
candideVertices: Candide 3模型顶点。可以用来可视化3D位置，缩放和旋转。
candideTriangles: 三角列表可以绘制Candide 3模型。
scale:全脸的规模。缩放因子
translationX:人脸的起始位置。起点恰好在顶点索引27（鼻子顶部）的后面。
translationY: 图像上脸部起源的y位置。起点恰好在顶点索引27（鼻子顶部）的后面。
rotationX:一个弧度角。围绕X轴旋转（俯仰，向上/向下翻转头）
rotationY:一个弧度角。围绕Y轴旋转（偏航，将头部向左/向右转动）
rotationZ:一个弧度角。围绕Z轴旋转（滚动，倾斜头向左/右）

第三章：
BRFMode:
BRFv4可以在以下任何一种模式下运行：
1.FACE_DETECTION:检测人脸矩形
如果您想跳过人脸跟踪部分并仅检测人脸矩形，请设置此模式。点跟踪也可以同步完成;

2.FACE_TRACKING:全脸检测和面部跟踪
如果您想要全脸检测和脸部追踪，请设置此模式。点跟踪也可以同步完成。

3.POINT_TRACKING:追踪人脸的点追踪；
如果您想跳过人脸检测和脸部追踪并仅追踪点，请设置此模式。

第四章：
BRFFace可以处于以下状态之一。
1.FACE_DETECTION（字符串）
    BRFFace试图最初在图像数据中检测到一张脸。
2.FACE_TRACKING_START（字符串）
  BRFFace在图像数据中找到了一张脸，并尝试对齐人脸跟踪。
3.FACE_TRACKING（字符串）
  BRFFace正在跟踪图像数据中的人脸。
4.RESET（字符串）
  由于BRFManager.reset（）调用或超过了BRFManager.setFaceTrackingResetParams（）
  中设置的重置参数，BRFFace触发了重置。
