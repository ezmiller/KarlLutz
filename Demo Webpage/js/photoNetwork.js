var width, height;
var year_sorted_photosets = [];

var root = {};

var photosetData;

var nodes,links;

var initialNodes = [], initialLinks = [];
var selectedNode;

var force,svg,g;
var circle1,circle2;
var link,node;

function init() {

  width = $(window).width();
  height = $(window).height();

  force = d3.layout.force()
    .linkDistance(10)
    .charge(-80)
    .gravity(.06)
    .size([width, height])
    .on("tick", tick);

  svg = d3.select("#photoNetwork").append("svg")
    .attr("width", width)
    .attr("height", height);

  g = svg.append("g");

  // "#3182bd" // collapsed package
  //       : d.children ? "#c6dbef" // expanded package
  //       : "#fd8d3c"; // leaf node


  circle1 = svg.append("circle")
                  .attr('class', 'node')
                  .attr('transform', "translate(40,40)")
                  .attr('r', 20)
                  .style("fill", '#fd8d3c');

  circle2 = svg.append("circle")
                  .attr('class', 'node')
                  .attr('transform', "translate(40,90)")
                  .attr('r', 20)
                  .style("fill", '#c6dbef');

  circle1.fixed = true;

  link = g.selectAll(".link");
  node = g.selectAll(".node");

}

function showPhotoNetwork(data) {
  photosetData = data;

  init();

  var year_sorted_photosets = [];

  console.log("number of photosets in showPhotoNetwork" + data.length);

  for (var key in data) {

    var photoset = data[key];
    photoset.name = photoset["unittitle"];
    photoset.photosetID = key;
    
    if (!photoset["unitdate-normal"]) {console.log(photoset);console.log(key)};

    var year = photoset["unitdate-normal"].split("/")[0].split("-")[0];

    if (year_sorted_photosets[year]) {
      year_sorted_photosets[year].push(photoset);
    }else{
      var photosets = [photoset];
      year_sorted_photosets[year] = photosets;
    };

  }

  var sortedKeys = Object.keys(year_sorted_photosets).sort();

  root.name = "root";
  root.parent = "null";
  root.fixed = true;
  root.x = 100;
  root.y = 200;

  var currentChild = root;

  var lastchild;

  for(var key in sortedKeys){

    var year = sortedKeys[key];
    currentChild.name = year;

    if (year === "1945") {
      lastchild = currentChild;
    }

    if (key < sortedKeys.length) {
    // if (key < 1) {
      
      var nextChild = {};
      nextChild.name = "";
      nextChild.parent = currentChild.name;

      currentChild.children = [nextChild];
      currentChild.size = year_sorted_photosets[year].length;

      for(var key in year_sorted_photosets[year]){
        var photoset = year_sorted_photosets[year][key];

        var photosetChild = {};
        photosetChild.photosetID = photoset.photosetID;          
        photosetChild.parent = currentChild.name;
        photosetChild.name = photoset["numLinks"];

        currentChild.children.push(photosetChild);          
      }

      currentChild = currentChild.children[0];

    }
  }

  lastchild.x = width - 50;
  lastchild.y = height - 50;
  lastchild.fixed = true;

  update();
}

function update() {

  if (!nodes) {
    nodes = flatten(root)
  };

  if (!links) {
    links = d3.layout.tree().links(nodes);
  };      

  // Restart the force layout.
  force
      .nodes(nodes)
      .links(links)
      .linkDistance(function (link) {
        return (link.target.children ? 5 : 30);
      })
      .start();

  // Update links.
  link = link.data(links, function(d) { return d.target.id; });

  link.exit().remove();

  link.enter().insert("line", ".node")
      .attr("class", "link");

  // Update nodes.
  node = node.data(nodes, function(d) { return d.id; });

  node.exit().remove();

  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .on("click", click)
      .call(force.drag);

  nodeEnter.append("circle")
      .attr("r", function(d) { 
        if (d.src) {return 1;};
        return Math.max(Math.sqrt(d.size)*3,13) || 5.5; 
      });

  nodeEnter.append("text")
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

  nodeEnter.append("svg:image")
        .attr('class','nodeImage')
        .attr('x',-9)
        .attr('y',-12)
        .attr('width', function(d){
          if (d.srcWidth > d.srcHeight) {
            return 20;
          }else{
            var ratio = d.srcWidth/d.srcHeight;
            return ratio*20;
          };
        })
        .attr('height', function(d){
          if (d.srcWidth < d.srcHeight) {
            return 24;
          }else{
            var ratio = d.srcHeight/d.srcWidth;
            return ratio*24;
          };
        })
        .attr("xlink:href",function(d){
          return d.src;
        });

  node.select("circle")
      .style("fill", color);

  node.on('mouseover', function(d) {

    console.log("mouseover");
    
    node.select("image").transition(200)
    .attr('width', function (n){
      if (d.id === n.id) { return 200 } else { return 20 };
    }).attr('height', function (n){
      if (d.id === n.id) { return 200 } else { return 24 };
    }).attr('x', function (n){
      if (d.id === n.id) { return -30 } else { return -9 };
    }).attr('y', function (n){
      if (d.id === n.id) { return -30 } else { return -12 };
    });;

    link.style('stroke-width', function(l) {
      if (d === l.source && !l.target.children)
        return 3;
      else
        return 2;
    });

  });

  node.on('mouseout', function() {
    link.style('stroke-width', 2);

    node.select("image").transition(200)
        .attr('width', 20).attr('height', 24);
  });
}

function tick() {
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("transform", function(d) { 

    return "translate(" + d.x + "," + d.y + ")"; 

  });
}

function color(d) {
  return d._children ? "#3182bd" // collapsed package
      : d.children ? "#c6dbef" // expanded package
      : "#fd8d3c"; // leaf node
}

// Toggle children on click.
function click(d) {

  if (d3.event.defaultPrevented || d.children) return; // ignore drag

  //Open overlay Image Viewer on click on photonode
  if (d.src) {
    showOverlayImage(d.srcLarge ? d.srcLarge : d.src, d.photoSetDescription);
    return;
  };

  if (selectedNode) {
    nodes = initialNodes;
    links = initialLinks;
    update();
  };

  //deselect
  if (selectedNode === d) {
    selectedNode = null;

    // g.transition()
    //       .duration(750)
    //       .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + 1 + ")translate(" + -d.x + "," + -d.y + ")");

    update();    
    return;
  };

  // force.stop();

  if (d.photosetID) {
    var photoset = photosetData[d.photosetID];

    if (photoset.images) {

      //save initial state
      initialNodes = nodes.slice();
      initialLinks = links.slice();
      selectedNode = d;

      for(var key in photoset.images) {
        var image = photoset.images[key];
        var htmllink = image["sizes"]["Medium"]["source"];
        var width = image["sizes"]["Medium"]["width"];
        var height = image["sizes"]["Medium"]["height"];

        var htmllinkLarge = htmllink;

        var photoSetDescription = photoset["unittitle"];

        if (image["id"]) {
          htmllinkLarge = image["id"];
        };

        // var htmllinkLarge = image["sizes"]["Large"]["source"];

        var n = {parent:d.id,id:"p"+nodes.length+1,src: htmllink,href: htmllink,srcLarge: htmllinkLarge,hrefLarge: htmllinkLarge,type: "photoNode",srcWidth: parseFloat(width),srcHeight: parseFloat(height),"photoSetDescription": photoSetDescription};
        var link = {source:d, target:n, type: "photoNodeLink"};

        nodes.push(n);
        links.push(link);

      }
    };

  };

  // g.transition()
  //     .duration(750)
  //     .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + 2 + ")translate(" + -d.x + "," + -d.y + ")");

  update();
}

function showOverlayImage(photoLink, description) {

  var imgContainer = document.createElement("div");
  imgContainer.className = "imageContainer";

  // var desc = document.createElement("div");
  // img.id = "photo";
  // img.className = "photoImage";

  var img = document.createElement("img");
  img.src = photoLink;
  img.id = "photo";
  img.className = "photoImage";

  imgContainer.appendChild(img);

  var close = document.createElement("img");
  close.src = "/Data/close.svg";
  close.id = "photoClose";
  close.className = "closeImage";  

  // imgContainer.appendChild(close);

  $("#photoNetwork").append(imgContainer);

  $('#photo').loupe({
    // width: 200, // width of magnifier
    // height: 150, // height of magnifier
  });

  imgContainer.addEventListener('click', function(e){
    imgContainer.remove();
    $('.loupe').remove();
  });

}

// Helper functions
// Returns a list of all nodes under the root.
function flatten(root) {
  var nodes = [], i = 0;

  function recurse(node) {
    if (node.children) {
      node.children.forEach(recurse);
    }
    if (!node.id) node.id = ++i;
    nodes.push(node);
  }

  recurse(root);
  return nodes;
}

function allKeys(root) {
  var keys = [];

  for (var key in root) {
      keys.push(key);
  }

  return keys;
}