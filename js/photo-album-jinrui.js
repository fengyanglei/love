//基础长度
var len = 750;

(function () {
    /* ==== definitions ==== */

    var diapo = [], layers = [], ctx, pointer, scr, camera, light, fps = 0, quality = [1, 2],

        // ---- poly constructor ----

        Poly = function (parent, face) {

            this.parent = parent;

            this.ctx = ctx;

            this.color = face.fill || false;

            this.points = [];

            if (!face.img) {

                // ---- create points ----

                for (var i = 0; i < 4; i++) {

                    this.points[i] = new ge1doot.transform3D.Point(
                        parent.pc.x + (face.x[i] * parent.normalZ) + (face.z[i] * parent.normalX),

                        parent.pc.y + face.y[i],

                        parent.pc.z + (face.x[i] * parent.normalX) + (-face.z[i] * parent.normalZ)
                    );

                }

                this.points[3].next = false;

            }

        },

        // ---- diapo constructor ----

        Diapo = function (path, img, structure) {

            // ---- create image ----

            this.img = new ge1doot.transform3D.Image(
                this, path + img.img, 1, {

                    isLoaded: function (img) {

                        img.parent.isLoaded = true;

                        img.parent.loaded(img);

                    }

                }
            );

            this.visible = false;

            this.normalX = img.nx;

            this.normalZ = img.nz;

            // ---- point center ----

            this.pc = new ge1doot.transform3D.Point(img.x, img.y, img.z);

            // ---- target positions ----

            this.tx = img.x + (img.nx * Math.sqrt(camera.focalLength) * 40);

            this.tz = img.z - (img.nz * Math.sqrt(camera.focalLength) * 40);

            // ---- create polygons ----

            this.poly = [];

            for (var i = -1, p; p = structure[++i];) {

                layers[i] = (p.img === true ? 1 : 2);

                this.poly.push(
                    new Poly(this, p)
                );

            }

        },

        // ---- init section ----

        init = function (json) {

            // draw poly primitive

            Poly.prototype.drawPoly = ge1doot.transform3D.drawPoly;

            // ---- init screen ----

            scr = new ge1doot.Screen({

                container: "canvas"

            });

            ctx = scr.ctx;

            scr.resize();

            // ---- init pointer ----

            pointer = new ge1doot.Pointer({

                tap: function () {

                    if (camera.over) {

                        if (camera.over === camera.target.elem) {

                            // ---- return to the center ----

                            camera.target.x = 0;

                            camera.target.z = 0;

                            camera.target.elem = false;

                        } else {

                            // ---- goto diapo ----

                            camera.target.elem = camera.over;

                            camera.target.x = camera.over.tx;

                            camera.target.z = camera.over.tz;

                            // ---- adapt tesselation level to distance ----

                            for (var i = 0, d; d = diapo[i++];) {

                                var dx = camera.target.x - d.pc.x;

                                var dz = camera.target.z - d.pc.z;

                                var dist = Math.sqrt(dx * dx + dz * dz);

                                var lev = (dist > 1500) ? quality[0] : quality[1];

                                d.img.setLevel(lev);

                            }

                        }

                    }

                }

            });

            // ---- init camera ----

            camera = new ge1doot.transform3D.Camera({

                focalLength: Math.sqrt(scr.width) * 10,

                easeTranslation: 0.025,

                easeRotation: 0.06,

                disableRz: true

            }, {

                move: function () {

                    this.over = false;

                    // ---- rotation ----

                    if (pointer.isDraging) {

                        this.target.elem = false;

                        this.target.ry = -pointer.Xi * 0.01;

                        this.target.rx = (pointer.Y - scr.height * 0.5) / (scr.height * 0.5);

                    } else {

                        if (this.target.elem) {

                            this.target.ry = Math.atan2(
                                this.target.elem.pc.x - this.x,

                                this.target.elem.pc.z - this.z
                            );

                        }

                    }

                    this.target.rx *= 0.9;

                }

            });

            camera.z = -10000;

            camera.py = 0;

            // ---- create images ----

            for (var i = 0, img; img = json.imgdata[i++];) {

                diapo.push(
                    new Diapo(
                        json.options.imagesPath,

                        img,

                        json.structure
                    )
                );

            }

            // ---- start engine ---- >>>

            setInterval(function () {

                quality = (fps > 50) ? [2, 3] : [1, 2];

                fps = 0;

            }, 1000);

            run();

        },

        // ---- main loop ----

        run = function () {

            // ---- clear screen ----

            ctx.clearRect(0, 0, scr.width, scr.height);

            // ---- camera ----

            camera.move();

            // ---- draw layers ----

            for (var k = -1, l; l = layers[++k];) {

                light = false;

                for (var i = 0, d; d = diapo[i++];) {

                    (l === 1 && d.draw()) ||

                    (d.visible && d.poly[k].draw());

                }

            }

            // ---- cursor ----

            if (camera.over && !pointer.isDraging) {

                scr.setCursor("pointer");

            } else {

                scr.setCursor("move");

            }

            // ---- loop ----

            fps++;

            requestAnimFrame(run);

        };

    /* ==== prototypes ==== */

    Poly.prototype.draw = function () {

        // ---- color light ----

        var c = this.color;

        if (c.light || !light) {

            var s = c.light ? this.parent.light : 1;

            // ---- rgba color ----

            light = "rgba(" +

                Math.round(c.r * s) + "," +

                Math.round(c.g * s) + "," +

                Math.round(c.b * s) + "," + (c.a || 1) + ")";

            ctx.fillStyle = light;

        }

        // ---- paint poly ----

        if (!c.light || this.parent.light < 1) {

            // ---- projection ----

            for (
                var i = 0;

                this.points[i++].projection();
            ) ;

            this.drawPoly();

            ctx.fill();

        }

    }

    /* ==== image onload ==== */

    Diapo.prototype.loaded = function (img) {

        // ---- create points ----

        var d = [-1, 1, 1, -1, 1, 1, -1, -1];

        var w = img.texture.width * 0.5;

        var h = img.texture.height * 0.5;

        for (var i = 0; i < 4; i++) {

            img.points[i] = new ge1doot.transform3D.Point(
                this.pc.x + (w * this.normalZ * d[i]),

                this.pc.y + (h * d[i + 4]),

                this.pc.z + (w * this.normalX * d[i])
            );

        }

    }

    /* ==== images draw ==== */

    Diapo.prototype.draw = function () {

        // ---- visibility ----

        this.pc.projection();

        if (this.pc.Z > -(camera.focalLength >> 1) && this.img.transform3D(true)) {

            // ---- light ----

            this.light = 0.5 + Math.abs(this.normalZ * camera.cosY - this.normalX * camera.sinY) * 0.6;

            // ---- draw image ----

            this.visible = true;

            this.img.draw();

            // ---- test pointer inside ----

            if (pointer.hasMoved || pointer.isDown) {

                if (

                    this.img.isPointerInside(
                        pointer.X,

                        pointer.Y
                    )

                ) camera.over = this;

            }

        } else this.visible = false;

        return true;

    }

    return {

        // --- load data ----

        load: function (data) {

            window.addEventListener('load', function () {

                ge1doot.loadJS(
                    "plugins/imageTransform3D/imageTransform3D.js",

                    init, data
                );

            }, false);

        }

    }

})().load({

    imgdata: getImgdata(),
    structure: [

        {

            // wall

            fill: {r: 255, g: 255, b: 255, light: 1},

            x: [-(len * 2 + 1), -(len - 10), -(len - 10), -(len * 2 + 1)],

            z: [-len, -len, -len, -len],

            y: [len, len, -len, -len]

        }, {

            // wall

            fill: {r: 255, g: 255, b: 255, light: 1},

            x: [-(len + 1), 2, 2, -len],

            z: [-len, -len, -len, -len],

            y: [len, len, -len, -len]

        }, {

            // wall

            fill: {r: 255, g: 255, b: 255, light: 1},

            x: [0, len + 2, len + 2, 0],

            z: [-len, -len, -len, -len],

            y: [len, len, -len, -len]

        }, {

            // wall

            fill: {r: 255, g: 255, b: 255, light: 1},

            x: [len - 10, len * 2 + 2, len * 2 + 2, len - 10],

            z: [-len, -len, -len, -len],

            y: [len, len, -len, -len]

        }, {

            // shadow

            fill: {r: 0, g: 0, b: 0, a: 0.2},

            x: [-(len - 80), len - 80, len - 80, -(len - 80)],

            z: [-len - 200, -len - 200, -len - 200, -len - 200],

            y: [len - 350, len - 350, -(len - 180), -(len - 180)]

        }, {

            // shadow

            fill: {r: 0, g: 0, b: 0, a: 0.2},

            x: [-30, 30, 30, -30],

            z: [-len - 200, -len - 200, -len - 200, -len - 200],

            y: [len - 250, len - 250, len - 350, len - 350]

        }, {

            // shadow

            fill: {r: 0, g: 0, b: 0, a: 0.2},

            x: [-30, 30, 30, -30],

            z: [-len - 200, -len - 200, -len - 200, -len - 200],

            y: [-(len - 180), -(len - 180), -len, -len]

        }, {

            // shadow

            fill: {r: 0, g: 0, b: 0, a: 0.2},

            x: [-30, 30, 20, -20],

            z: [-len - 200, -len - 200, -(len - 600), -(len - 600)],

            y: [-len, -len, -len - 300, -len - 300]

        }, {

            // base

            fill: {r: 32, g: 32, b: 32},

            x: [-80, 80, 80, -80],

            z: [-(len - 550), -(len - 550), -(len - 650), -(len - 650)],

            y: [-len - 300, -len - 300, -len - 300, -len - 300]

        }, {

            // support

            fill: {r: 16, g: 16, b: 16},

            x: [-20, 20, 20, -20],

            z: [-(len - 600), -(len - 600), -(len - 600), -(len - 600)],

            y: [len + 150, len + 150, -len - 300, -len - 300]

        }, {

            // frame

            fill: {r: 255, g: 255, b: 255},

            x: [-(len - 270), -(len - 270), -(len - 270), -(len - 270)],

            z: [0, -70, -70, 0],

            y: [-(len - 110), -(len - 110), (len - 110), (len - 110)]

        }, {

            // frame

            fill: {r: 255, g: 255, b: 255},

            x: [len - 270, len - 270, len - 270, len - 270],

            z: [0, -70, -70, 0],

            y: [-(len - 110), -(len - 110), len - 110, len - 110]

        },

        {img: true}

        // ,{
        //
        //     // ceilingLight
        //
        //     fill: {r: 255, g: 128, b: 0},
        //
        //     x: [-50, 50, 50, -50],
        //
        //     z: [450, 450, 550, 550],
        //
        //     y: [500, 500, 500, 500]
        //
        // }, {
        //
        //     // groundLight
        //
        //     fill: {r: 255, g: 128, b: 0},
        //
        //     x: [-50, 50, 50, -50],
        //
        //     z: [450, 450, 550, 550],
        //
        //     y: [-500, -500, -500, -500]
        //
        // }

    ],

    options: {

        imagesPath: ""

    }

});

/**
 * 图片路径数据
 * @returns {Array}
 */
function getImgPath() {
    return jinruiImgArr;
}

/**
 * 图片位置数据
 */
function getImgdata() {
    //图片位置数据
    var imgdata = [];
    //图片路径
    var images = getImgPath();
    //每面墙图片数量
    var num = parseInt(images.length / 4);
    //墙一半长度+ len * 2
    var h = (num - 1) * len + len * 2;
    var z = num * len;
    for (var i = 0; i < num; i++) {
        h -= len * 2;
        imgdata.push({img: images[i], x: h, y: 0, z: z, nx: 0, nz: 1});
        imgdata.push({img: images[i + num * 2], x: h, y: 0, z: -z, nx: 0, nz: -1});
        imgdata.push({img: images[i + num], x: z, y: 0, z: h, nx: -1, nz: 0});
        imgdata.push({img: images[i + num * 3], x: -z, y: 0, z: h, nx: 1, nz: 0});
    }
    return imgdata;
}

/**
 * 判断文件是否存在
 * @param url
 * @returns {boolean}
 */
function isExistFile(url) {
    var xmlHttp;
    if (window.ActiveXObject) {
        xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
    } else if (window.XMLHttpRequest) {
        xmlHttp = new XMLHttpRequest();
    }
    xmlHttp.open("Get", url, false);
    xmlHttp.send();
    return (xmlHttp.status == 404) ? false : true;
}