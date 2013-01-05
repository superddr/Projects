var SupportsTouches = ("createTouch" in document), //判断是否支持触摸
    StartEvent = SupportsTouches ? "touchstart" : "mousedown", //支持触摸式使用相应的事件替代
    MoveEvent = SupportsTouches ? "touchmove" : "mousemove",
    EndEvent = SupportsTouches ? "touchend" : "mouseup";

var myprojects = {};
var myresources = {};

var dw, leftDays, allDays;//changed in Resize
var modes = {
    Projects:new ProjectView(),
    Resources:new ResourcesView(),
    Resource:"Resource"
};

var mode = modes.Projects;
//var mode = modes.Projects;

//------------------------------		初始化		--------------------------------------------------------------------
$(function () {
    try {
        initAppCache();
    } catch (e) {

    }
    //初始化右下角 按钮
    $("#btnRefresh").bind(EndEvent, function () {
        window.location.reload()
    });
    $("#btnLogout").bind(EndEvent, showLogin);
    $("#btnAdd").bind(EndEvent, mode.addNew);
    $("#btnSwitch").bindClick(function () {
        $("#parent").css({transform:"rotateY(90deg)", transition:"0.3s ease-in"});
        setTimeout(function () {
            $("#parent").css({transform:"rotateY(-90deg)", transition:"0.01s"});
        }, 300);
        setTimeout(function () {
            mode.switchMode();
            $("#btnAdd").unbind().bind(EndEvent, mode.addNew);
            mode.display();
            $("#parent").css({transform:"rotateY(0deg)", transition:"0.3s ease-out"});
        }, 317);
        setTimeout(function () {
            $("#parent").removeAttr("style");
            updateNames();
            $("#loading").hide();
        }, 620);
        $("#loading").show();
    });
    //防止屏幕被拖动

    $("form").bind(StartEvent, function (e) {
        if ("TD,TH,FORM".indexOf(e.target.tagName) > -1) {
            e.preventDefault();
        }
    });

    //定义窗口大小

    initDialogs();
    initNetwork();

    //先从本地缓存中读取数据
    myprojects = JSON.parse(localStorage.data || "{}");
    myresources = JSON.parse(localStorage.resources || "{}");
    $(window).resize(Resize).resize();

    initUIOperations();

    //尝试读取网络数据
    $.post("api.aspx");
});
//------------------------------        for Application Cache     ------------------------------------------------------
function initAppCache() {
    var appCache = window.applicationCache;
    appCache.addEventListener('updateready', function (e) {
        appCache.swapCache();
        window.location.reload();
    }, false);
    appCache.addEventListener("error", function (e) {
        clearInterval(handle);
    });
    var handle = setInterval("applicationCache.update();", 3 * 1000);
}
//------------------------------        for Window Resie     -----------------------------------------------------------
function Resize() {
    var w = document.documentElement.clientWidth;
    var h = document.documentElement.clientHeight;

    allDays = Math.floor(w * 2 / 40);
    dw = allDays * 40;
    leftDays = Math.floor((allDays - 1) / 2);
    $("#timeline").width(dw).height(h).css("left", -(dw - w) / 2);
    $("#dates").width(dw).height(h);
    redraw();
    updateNames();
}
//------------------------------        for all dialogs     ------------------------------------------------------------
function initDialogs() {
    $("[name=close]").bind(EndEvent, function () {
        $("input,textarea").blur();
        $("#back").fadeOut();
    }); //初始化所有的关闭按钮
    $("form").submit(function (e) {
        $(this).ajaxSubmit();
        return false;
    }); //初始化所有的提交按钮
    $("input[name=color]").each(function () {
        $(this).css("background-color", $(this).val());
    }); //初始化色彩选择按钮

    //点击黑底关闭
    $("body").bind(StartEvent, function (e) {
        if (e.target === $("#back td")[0]) {
            function bodyend(e) {
                $("body").unbind(EndEvent, bodyend);
                if (e.target === $("#back td")[0]) {
                    $("#back").fadeOut();
                }
            }

            $("body").bind(EndEvent, bodyend);
        }
    });

    // Esc键关闭
    $(window).keyup(function (e) {
        if (e.which === 27) {
            $("#back").fadeOut();
        }
    });

    //背景
    $("#back").fadeOut();
}
function showLogin() {
    $("#login #logins").html("");
    var names = localStorage.names ? JSON.parse(localStorage.names) : { };

    for (var i in names) {
        $("#logins").append("<div ncookie='" + names[i] + "'>" + i + "</div>");
    }

    $("#logins div").bind(EndEvent, function () {
        $.cookie(".ASPXAUTH", $(this).attr("ncookie"), { expires:1000 });
        $.post("api.aspx");
    });

    //------------------	 注册
    $("#login input[name=register]").unbind("click").click(function () {
        $.post("api.aspx", { action:"regist", user:$("#login input[name=user]").val(), pass:$("#login input[name=pass]").val() });
    });

    showDialog("login");
}
function showDialog(id) {
    setTimeout(function () {
        var dialog = $("#" + id);
        $("#back form").hide();
        dialog.show();
        $("#back").fadeIn();
    }, 130);
}
//----------------------------------		networks			--------------------------------------------------------
function initNetwork() {
    $("body").ajaxStart(function () {
        $("#loading").show();
    });
    $("body").ajaxSuccess(function (e, xhr, settings) {
        $("#loading").hide();
        var data = $.parseJSON(xhr.responseText);

        //若出错，则不消除对话框
        if (!data.message) {
            $("#back").fadeOut().hide();
        }

        //若有提示则弹出
        if (data.message)alert(data.message);

        // 如果未登录，则提示登录
        if (data.auth == false) {
            showLogin();
            return;
        }


        myprojects = data.projects;
        myresources = data.resources;

        //保存项目数据到本地
        localStorage.data = JSON.stringify(myprojects);
        localStorage.resources = JSON.stringify(myresources);

        //显示项目
        redraw();
        updateNames();

        //保存登录用户的账户信息
        var names = JSON.parse(localStorage.names || "{}");
        names[data.user.toLowerCase()] = $.cookie(".ASPXAUTH");
        localStorage.names = JSON.stringify(names);
    });

    $("body").ajaxError(function (e, xhr, settings) {
        $("#loading").hide();
        if (xhr.status == 0) {//网络断开时，获取本地localStorage的数据
            alert("Network Error");
        } else {
            alert("error,code:" + xhr.status);
            alert(xhr.responseText);
        }
    });
}
//---------------------------------			show Projects		--------------------------------------------------------
function redraw() {
    $("#mon,#date,#grid").html("");
    var dt = new Date();
    dt.setDate(dt.getDate() - leftDays);
    dt.setHours(0, 0, 0, 0);

    var lastmon = -1;
    for (var i = 0; i < allDays; i++) {
        var day = dt.getDay();
        var date = dt.getDate();
        var month = dt.getMonth();

        if (month == lastmon) {
            $("#mon td").last().attr("colspan", parseInt($("#mon td").last().attr("colspan")) + 1);
        } else {
            $("#mon").append("<td colspan='1'><span>" + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month] + "</span></td>");
            if (month % 2 == 0)
                $("#mon td").last().addClass("eve");
        }
        lastmon = month;

        $("#date").append("<td day=" + day + " date='" + date + "'>" + date + "</td>");
        $("#grid").append("<td day=" + day + " date='" + date + "'></td>");

        dt.setDate(dt.getDate() + 1);
    }
    $("#dates td[date='1']").css("border-left", "solid 1px #aaa");
    $("tr td[day='0'],tr td[day='6']").addClass("weekend");

    if (leftDays > 0) {
        $("#date td").eq(leftDays).addClass("today");
        $("#grid td").eq(leftDays).addClass("today");
    }

    mode.display();
}
// ==========================   			UI	Operations	    ========================================================
function initUIOperations() {
    var draging = false;
    var speed = 0;
    var oleft, otop;
    var ox = 0, oy = 0, oox = 0;
    var inertiaHandler = 0;

    var dx, dy;

    $("body").on(StartEvent, function (e) {
        if (!$.contains($("#parent")[0], e.target)) return;
        clearInterval(inertiaHandler);

        oleft = $("#timeline").position().left;
        otop = $("#lines").position().top;

        ox = getX(e);
        oy = getY(e);
        oox = speed = dx = dy = 0;

        draging = true;
        inertiaHandler = setInterval(inertia, 19);
        $("#lines span").hide();
    });

    $("body").on(MoveEvent, function (e) {
        if (!draging) return;
        e.preventDefault();

        dx = getX(e) - ox;
        dy = getY(e) - oy;
    });
    $("body").on(EndEvent, function (e) {
        if (!draging) return;
        e.preventDefault();
        draging = false;
    });

    $("#btnSwitch").bindClick(function () {
        speed = 0;
        inertia();
    });
    function inertia() {
        var x = $("#timeline").position().left;
        //仍在拖动中，计算当前惯量，跳过后续处理
        if (draging) {
            if (Math.abs(dy) < Math.abs(dx)) {
                $("#timeline").css("left", oleft + dx + "px");
                updateMon();
            } else {
                if (otop + dy > 0 && dy > 0) {
                    dy = Math.max(-otop, 0);
                } else if (otop + dy + $("#lines").height() < $("#linesclip").height() && dy < 0) {
                    dy = Math.min($("#linesclip").height() - otop - $("#lines").height(), 0);
                }

                $("#lines").css("top", otop + dy);
            }
            speed += (dx - oox - speed) / 3;
            oox = dx;
            return;
        }

        //判断是否越界
        var slid = x > 0 ? -1 : x < -dw + document.documentElement.clientWidth ? 1 : 0;

        //越界则切换
        if (slid != 0) {
            var delta = slid * Math.floor(allDays / 3);
            leftDays -= delta;
            redraw();
            $("#lines span").hide();
            x += dw * delta / allDays;
            slid = 0;
        }

        //阻尼
        x += speed;
        speed *= 0.93;

        //更新
        $("#timeline").css("left", x);
        updateMon();
        //
        if (Math.abs(speed) < 0.5) {
            updateNames();
            clearInterval(inertiaHandler);
        }
    }
}

function updateNames() {
    $("#lines div").each(function () {
        var div = $(this);
        var dl = div.offset().left;
        $("#lines span[pid='" + div.attr("pid") + "']").css({ "left":Math.max(dl, Math.min(dl + div.width(), 0)) - $("#timeline").offset().left });
    });
    $("#lines span").fadeIn(100);
}

function updateMon() {
    $("#mon td").each(function () {
        var a = -($(this).offset().left);
        a = Math.max(a, 0);
        a = Math.min(a + 5, parseInt($(this).attr("colspan")) * 40 - 30);
        a = Math.floor(a);

        $(this).find("span").css("left", a + "px");
    });
}
// ================================		Tool functions		============================================================
function getX(e) {
    if (!e.originalEvent.touches) {
        return e.pageX;
    } else {
        return e.originalEvent.touches[0].pageX;
    }
}
function getY(e) {
    if (!e.originalEvent.touches) {
        return e.pageY;
    } else {
        return e.originalEvent.touches[0].pageY;
    }
}
function echo(s) {
    $("#label").text(s);
}
Date.prototype.format = function (fmt) { //author: meizz
    var o = {
        "M+":this.getMonth() + 1, //月份
        "d+":this.getDate(), //日
        "h+":this.getHours(), //小时
        "m+":this.getMinutes(), //分
        "s+":this.getSeconds(), //秒
        "q+":Math.floor((this.getMonth() + 3) / 3), //季度
        "S":this.getMilliseconds()             //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
function formatDate(input) {
    var date = new Date(input);
    return date.format("yyyy-MM-dd");
}
jQuery.queryString = function (query) {
    var result = {};
    var search = query.split('&');

    for (var i = 0; i < search.length; i++) {
        result[search[i].split('=')[0]] = decodeURI(search[i].split('=')[1]);
    }
    return result;
}

jQuery.fn.bindClick = function (click, longpress) {
    this.each(function () {
        var $this = $(this);
        $this.bind(StartEvent, function (e) {
            function clear() {
                $this.unbind(EndEvent).unbind(MoveEvent);
                clearTimeout(handler);
            }

            //click事件
            $this.bind(MoveEvent, clear).bind(EndEvent, function (e) {
                click.call(this, e);
                clear();
            });
            //long press事件
            var handler = setTimeout(function () {
                if (longpress) {
                    longpress.call($this[0], e);
                    clear();
                }
            }, 400);
        })
    })
    return this;
}