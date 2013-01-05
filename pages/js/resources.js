function ResourcesView() {
    this.switchMode = function(){
   		mode = modes.Projects;
   	}
	this.display = function () {
		var linesclip = $("<div id='linesclip'></div>").width(dw).height(document.documentElement.clientHeight - $("#linesclip").position().top);
		var lines = $("<div id='lines'></div>").width(dw);
		var today = new Date().getTime();

		function getday(time) {
			return Math.ceil((time - today) / 24 / 60 / 60000) + leftDays;
		}

		var ii = 0;
		var hh = 47;
		for (var i in myresources) {
			var res = myresources[i];

			var tp = ii * hh + 19;
			var div = $("<div></div>").attr("rid", res.name).attr("pid", res.name).css({left:-50, width:dw + 100, "background-color":"rgba(255,255,255,0.3)", top:tp});
			var text = $("<span></span>").attr("pid", res.name).text(res.name).css("top", tp - 17 + "px");

			lines.append(div).append(text);

			for (var j in res.projects) {

				var proj = myprojects[res.projects[j]];

				if(!proj)continue;
				var starttime = getday(proj.startdate), endtime = getday(proj.enddate);

				if (starttime >= allDays || endtime < 0)continue;
				starttime = Math.max(-1, starttime) * 40;
				endtime = Math.min(allDays + 1, endtime) * 40 + 40;

				var dv = $("<div></div>").attr("rid", res.name).css({left:starttime, width:endtime - starttime, "background-color":"#005399", top:tp, opacity:0.55});
				lines.append(dv);
			}
			ii++;
		}

		lines.height(Math.max(ii * hh + 50, $("#linesclip").height())).find("div[rid]").bindClick(function () {updateResource($(this).attr("rid"));});
		lines.css("top",$("#lines").position().top);
		linesclip.append(lines);
		$("#linesclip").remove();
		$("#timeline").append(linesclip);
	}
	function insertResource() {
		showDialog("addResource");
	}

	function updateResource(name) {
		$("#updateResource span[name=name]").text(name);
		$("#updateResource input[name=name]").val(name);
		var search = myresources[name].projects ? "..," + myresources[name].projects.join(",") + "," : "";
		var container = $("#updateResource [name=projects]").html("");

		var today = new Date().getTime();

		//项目排序
		var ordered = [];
		for(var i in myprojects){ordered.push(myprojects[i]);}
		ordered.sort(function (a, b) {
			if((search.indexOf("," + a.id + ",") > -1) == (search.indexOf("," + b.id + ",") > -1))
				return Math.abs(a.startdate - today) - Math.abs(b.startdate-today);
			else
				return search.indexOf("," + b.id + ",") - search.indexOf("," + a.id + ",");
		});

		for (var i in ordered) {
			var prj = ordered[i];
			var cont = $("<div></div>");

			var check = $("<input type='checkbox' name='project' />").val(prj.id).css({"background-color":prj.color});

			if (search.indexOf("," + prj.id + ",") > -1)check.click();

			cont.bindClick(function (e) {
				if (e.target.tagName != "INPUT")
					$(this).find("input").click();
			}).append(check).append(prj.name);
			container.append(cont);
		}

		//绑定删除按钮
		$("#updateResource [name=delete]").unbind("click").bind("click",function(){
			if (confirm("you really want to delete " + name + " ?")) {
				$.post("api.aspx", { action:"deleteresource", name:name });
			}
		});
		container[0].scrollTop = 0
		showDialog("updateResource");
	}

	this.addNew = insertResource;


}