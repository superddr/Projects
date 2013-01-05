function ProjectView() {
    this.switchMode = function () {
        mode = modes.Resources;
    }
	function insertProject() {
		var dt = new Date();
		$("#newProject input[name=name]").val("new Project");
		$("#newProject input[name=startdate]").val(formatDate(dt));
		dt.setMonth(dt.getMonth() + 1);
		$("#newProject input[name=enddate]").val(formatDate(dt));
		$("#newProject [name=color]").eq((myprojects.length + 1) % 6).click();

		showDialog("newProject");
	}

	function updateProject(prj) {//     显示 更新项目 对话框
		prj = myprojects[prj];
		$("#updateProject [name=id]").val(prj.id);
		$("#updateProject [name=prjname]").val(prj.name);
		$("#updateProject [value=" + prj.color + "]").click();
		$("#updateProject :text,#updateProject textarea").each(function () {
			this.value = prj[this.name].replace(/<br \/>/g, "\n")
		});

		$("#updateProject [name=startdate]").val(formatDate(prj.startdate));
		$("#updateProject [name=enddate]").val(formatDate(prj.enddate));

		//                   删除项目
		$("#updateProject input[name=delete]").unbind("click").click(function () {
			if (confirm("you really want to delete " + $("#updateProject [name=prjname]").val() + " ?")) {
				$.post("api.aspx", { action:"deleteproject", id:$("#updateProject [name=id]").val() });
			}
		});

		showDialog("updateProject");
	}

	function updatePoint(pid, pointid) {
		var prj = myprojects[pid];
		var point = prj.points[pointid];

		$("#updatepoint [name=id]").val(point.id);
		//点击时间点对话框上的 项目 链接，跳至项目更新对话框
		$("#updatepoint [name=projectname]").text(prj.name).unbind().bind(EndEvent, function (e) {
			updateProject(pid);
		});
		$("#updatepoint [name=point]").val(formatDate(point.point));
		$("#updatepoint [name=project]").val(prj.id);
		$("#updatepoint [name=content]").val(point.content.replace(/<br \/>/g, "\n"));
		$("#updatepoint [name=done]").attr("checked", point.done);

		// 					delete timepoint
		$("#updatepoint input[name=delete]").unbind("click").click(function (e) {
			if (confirm("you really want to delete this point ?")) {
				$.post("api.aspx", { action:"deletepoint", id:$("#updatepoint [name=id]").val(), project:$("#updatepoint [name=project]").val()});
			}
		});
		showDialog("updatepoint");
	}

	function addPoint(day, projectid) {
		$("#addpoint input[name=point]").val(formatDate(day));
		$("#addpoint input[name=project]").val(projectid);
		showDialog("addpoint");
	}

	this.addNew = insertProject;

	this.display = function display() {
		var linesclip = $("<div id='linesclip'></div>").width(dw).height(document.documentElement.clientHeight - $("#linesclip").position().top);
		var lines = $("<div id='lines'></div>").width(dw);

		var today = new Date();
        today.setHours(0,0,0);
        today = today.getTime();
		function getday(time) {
			return Math.floor((time - today) / 24 / 60 / 60000) + leftDays;
		}

		if (!myprojects)return;

		var ii = 0;
		var hh = 47;
		//项目排序
		var ordered = [];
		for(var i in myprojects){ordered.push(myprojects[i]);}

		ordered.sort(function (a, b) {
			return a.enddate - b.enddate;
		});
		for (var i in ordered) {
			var proj = ordered[i];

			var starttime = getday(proj.startdate);
			var endtime = getday(proj.enddate);

			if (starttime >= allDays || endtime < 0)continue;
			starttime = Math.max(-1, starttime) * 40;
			endtime = Math.min(allDays + 1, endtime) * 40 + 40;

			var div = $("<div></div>").attr("pid", proj.id).css({left:starttime, width:endtime - starttime, "background-color":proj.color});
			var text = $("<span></span>").attr("pid", proj.id).text(proj.name);

			var tp = ii * hh + 19;
			if (proj.oldy != undefined) {
				div.css("top", proj.oldy * hh + 19 + "px").delay(100).animate({top:tp}, 300);
				text.css("top", proj.oldy * hh + 2 + "px").delay(100).animate({top:ii * hh + 2}, 300);
			} else {
				div.css("top", tp);
				text.css("top", ii * hh + 2 + "px");
			}
			lines.append(div).append(text);
			for (var j in proj.points) {
				var point = proj.points[j];
				var pointtime = getday(point.point);
				if (pointtime < 0 || pointtime >= allDays) continue;

				pointtime = 40 * pointtime;
				pointtime += 40 / 2 - 12;

				lines.append($("<a></a>").addClass(point.point > today ? "white" : point.done ? "green" : "red").attr("project", proj.id).attr("point", j).css({left:pointtime, top:tp}));
			}

			proj.oldy = ii;
			ii++;
		}
		lines.height(Math.max(ii * hh + 50, $("#linesclip").height()));

		lines.find("a").hide().delay(300).fadeIn(300);
		//点击时间点 弹出更新时间点对话框，如果点击后移动，则判定为拖动，取消点击动作
		lines.find("a").bindClick(function () {
			updatePoint($(this).attr("project"), $(this).attr("point"));
		});

		lines.find("div").bindClick(function (e) {
			updateProject($(this).attr("pid"));
		}, function (e) {
			var offd = Math.floor((getX(e) - $("#lines").offset().left) / (dw / allDays));
			var d = new Date();
			d.setDate(d.getDate() + offd - leftDays);
			addPoint(d, myprojects[$(this).attr("pid")].id);
		})

		lines.css("top",$("#lines").position().top);
		linesclip.append(lines);

		$("#linesclip").remove();
		$("#timeline").append(linesclip);
	}

}