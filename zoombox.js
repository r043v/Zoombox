var scr=document.getElementsByTagName('script');
var zoombox_path = scr[scr.length-1].getAttribute("src").replace('zoombox.js','');

(function($){

var options = {
    theme       : 'zoombox',      //available themes : zoombox,lightbox, prettyphoto, darkprettyphoto, simple
    opacity     : 0.8,                  // Black overlay opacity
    duration    : 800,                // Animation duration
    animation   : true,             // Do we have to animate the box ?
    width       : 600,                  // Default width
    height      : 400,                  // Default height
    gallery     : true,                 // Allow gallery thumb view
    autoplay : false,                // Autoplay for video
    overflow  : false,               // Allow images bigger than screen ?
    minSize : 200,		// minimum picture draw size
    minPaddingX : 20,		// padding minimum size, between image and box
    minPaddingY : 20
}
var images;// = new Array();         // Gallery Array [gallery name][link]
var elem;           // HTML element currently used to display box
var isOpen = false; // Zoombox already opened ?
var link;           // Shortcut for the link
var width;
var height;
var timer;          // Timing for img loading
var i = 0;          // iteration variable
var content;        // The content of the box
var type = 'multimedia'; // Content type
var position = false;
var imageset = false;
var state = 'closed';

/**
* You can edit the html code generated by zoombox for specific reasons.
* */
var html = '<div id="zoombox"> \
            <div class="mask"></div>\
            <div class="container">\
                <div class="content"></div>\
                <div class="title"></div>\
                <div class="next"></div>\
                <div class="prev"></div>\
                <div class="close"></div>\
                <div class="gallery"></div>\
            </div>\
        </div>';
// Regular expressions needed for the content
var filtreImg=                  /(\.jpg)|(\.jpeg)|(\.bmp)|(\.gif)|(\.png)/i;
var filtreMP3=			/(\.mp3)/i;
var filtreFLV=			/(\.flv)/i;
var filtreSWF=			/(\.swf)/i;
var filtreQuicktime=	/(\.mov)|(\.mp4)/i;
var filtreWMV=			/(\.wmv)|(\.avi)/i;
var filtreDailymotion=	/(http:\/\/www.dailymotion)|(http:\/\/dailymotion)/i;
var filtreVimeo=		/(http:\/\/www.vimeo)|(http:\/\/vimeo)/i;
var filtreYoutube=		/(youtube\.)/i;
var filtreKoreus=		/(http:\/\/www\.koreus)|(http:\/\/koreus)/i;
var galleryLoaded = 0; 

$.zoombox = function(el,options) {

}
$.zoombox.options = options;
$.zoombox.close = function() {
    close();
}
$.zoombox.open = function(tmplink,opts){
    elem = null;
    link = tmplink;
    options = $.extend({},$.zoombox.options,opts);
    load();
}
$.zoombox.html = function(cont,opts){
    content = cont;
    options = $.extend({},$.zoombox.options,opts);
    width = options.width;
    height = options.height;
    elem = null;
    open();
}
$.fn.zoombox = function(opts){    
    /**
     * Bind the behaviour on every Elements
     */
    var images = new Array(); // allow multiple call on one page, for content loaded from ajax
    
    return this.each(function(){
        // No zoombox for IE6
        if($.browser.msie && $.browser.version < 7 && !window.XMLHttpRequest){
            return false;
        }
        var obj = this;
	var $t = $(this);
        var galleryRegExp =  /zgallery([0-9]+)/;
        var gallery = galleryRegExp.exec($t.attr("class"));
        var tmpimageset = false;
	
        if(gallery != null)
	{	if(!images[gallery[1]]) images[gallery[1]]=new Array();
		images[gallery[1]].push($(this));
		var pos = images[gallery[1]].length-1;
		tmpimageset = images[gallery[1]];
        }
        
        $t.unbind('click').click(function()
	{   options = $.extend({},$.zoombox.options,opts);
            if(state!='closed') return false;
            elem = $t;
            link = elem.attr('href');
            imageset = tmpimageset;
            position = pos;
            load();
            return false;
        });
    });
}

/**
 * Load the content (with or without loader) and call open()
 * */
function load(){
    if(state=='closed') isOpen = false;
    state = 'load';
    setDim();
    if(filtreImg.test(link)){
        img=new Image();
        img.src=link;
        $("body").append('<div id="zoombox_loader"></div>');
        $("#zoombox_loader").css("marginTop",scrollY());
        timer = window.setInterval(function(){loadImg(img);},100);
    }else{
        setContent();
        open();
    }
}

/**
 * Build the HTML Structure of the box
 * */
function build(){
    // We add the HTML Code on our page
    $('body').append(html);
    $(window).keydown(function(event){
        shortcut(event.which);
    });
    $(window).resize(function(){
        resize();
    });
    $('#zoombox .mask').hide();
    $('#zoombox .gallery').hide();
    // We add a specific class to define the box theme
    $('#zoombox').addClass(options.theme);
    // We bind the close behaviour (click on the mask / click on the close button)
    $('#zoombox .close,#zoombox .mask,.zoombox_close').click(function(){
        close();
        return false;
    });
    // Next/Prev button
    if(imageset == false){
        $('#zoombox .next,#zoombox .prev').remove();
    }else{
        $('#zoombox .next').click(function(){
            next();
        });
        $('#zoombox .prev').click(function(){
            prev();
        });
    }
}

/**
*   Gallery System (with slider if too much images)
*/
function gallery(){
    var loaded = 0;
    var width = 0;
    var contentWidth = 0;   
    if(options.gallery){
        if(imageset === false){
            $('#zoombox .gallery').remove(); 
            return false;
        } 
        for(var i in imageset){
            var imgSrc = zoombox_path+'img/blank.png';
            var img = $('<img src="'+imgSrc+'" class="video gallery'+(i*1)+'"/>');
            if(filtreImg.test(imageset[i].attr('href'))){
               imgSrc = imageset[i].attr('href')
               img = $('<img src="'+imgSrc+'" class="gallery'+(i*1)+'"/>');
            }
            img.appendTo('#zoombox .gallery');
            img.click(function(){
               gotoSlide($(this).attr('class').replace('gallery',''));
               $('#zoombox .gallery img').removeClass('current');
               $(this).addClass('current');
            });
            if(i==position){ img.addClass('current'); }

            // Listen the loading of Images
            $("<img/>").data('img',img).attr("src", imgSrc).load(function() {
                    loaded++;
                    var img = $(this).data('img');
                    img.width(Math.round(img.height() * this.width/this.height));
                    if(loaded == $('#zoombox .gallery img').length){
                        var width = 0; 
                        $('#zoombox .gallery img').each(function(){
                            width += $(this).outerWidth(); 
                            $(this).data('left',width); 
                        });
                        var div = $('<div>').css({
                            position:'absolute',
                            top:0,
                            left:0,
                            width: width
                        });
                        $('#zoombox .gallery').wrapInner(div); 
                        contentWidth = $('#zoombox .gallery').width(); 
                        $('#zoombox').trigger('change'); 
                    }
                });
        }
    }

    $('#zoombox .mask').mouseover(function(){
        $('#zoombox .gallery').stop().fadeTo(500,0);
    });
    $('#zoombox .mask').mouseout(function(){
        $('#zoombox .gallery').stop().fadeTo(500,0.9);
    });
    
    $('#zoombox').bind('change',function(e,css){
        if($('#zoombox .gallery div').width() < $('#zoombox .gallery').width){
            return true;
        }
        var d = 0;
        var center = 0; 
        if(css != null){
            d = options.duration;
            center = css.width / 2;
        }else{
            center = $('#zoombox .gallery').width()/2;
        }
        var decal = - $('#zoombox .gallery img.current').data('left') + $('#zoombox .gallery img.current').width() / 2;
        var left = decal + center;
        if(left < center * 2 - $('#zoombox .gallery div').width() ){
            left = center * 2 - $('#zoombox .gallery div').width();
        }
        if(left > 0){ 
            left = 0;
        }
        $('#zoombox .gallery div').animate({left:left},d);
    });

}

/**
 * Open the box
 **/
function open(){
    if(isOpen == false) build(); else $('#zoombox .title').empty();
    $('#zoombox .close').hide();
    $('#zoombox .container').removeClass('multimedia').removeClass('img').addClass(type);

    // We add a title if we find one on the link
    if(elem != null && elem.attr('title')) $('#zoombox .title').append(elem.attr('title'));

    // And after... Animation or not depending of preferences
    // We empty the content

    // If it's an image we load the content now (to get a good animation)
	if(type=='img' && isOpen == false && options.animation == true)
		$('#zoombox .content').html(content);
	else	$('#zoombox .content').empty();
    
    // Default position/size of the box to make the "zoom effect"
	if(isOpen == false)
	{	if(elem != null)
		{	$img =  elem.find('img');
			if($img.length != 0)
			{	$ioff = $img.offset();
				$('#zoombox .container').css({width:$img.width(),height:$img.height(),top:$ioff.top,left:$ioff.left,opacity:0,marginTop:$img.css('marginTop')});
			} else	{	$eoff = elem.offset();
					$('#zoombox .container').css({width:elem.width(),height:elem.height(),top:$eoff.top,left:$eoff.left});
				}
		} else	$('#zoombox .container').css({width:100,height:100,top:windowH()/2-50,left:windowW()/2-50})
	}
    
	var paddingx = options.minPaddingX;
	var paddingy = options.minPaddingY;
    
    if(options.minSize)
    {	var minSize = options.minSize;

	// min resize
	if(width < minSize || height < minSize)
	{			
		if(width < height)
		{	var r = height/width;
			height=minSize*r;
			width = minSize;
		} else	if(height < width)
			{	var r = width/height;
				height=minSize;
				width = minSize*r;
			} else	{	width=height=minSize;
				}
	}
	
	// max resize
	var maxx = windowW()-40;
	var maxy = windowH()-40;

	if(width > maxx || height > maxy)
	{	if(width > height)
		{	var r = height/width;
			width = maxx;
			height=width*r;
		} else	if(height > width)
			{	var r = width/height;
				height=maxy;
				width=height*r;
			} else { if(maxx > maxy) width=height=maxy; else width=height=maxx; }
	}

	if(width < minSize) paddingx = (minSize-width)/2;
 	if(height < minSize) paddingy = (minSize-height)/2;
 
 	if(paddingx < options.minPaddingX) paddingx = options.minPaddingX;
	if(paddingx < options.minPaddingY) paddingy = options.minPaddingY;
    }
    
    // Final position/size of the box after the animation
    var css = {
        width : width,
        height: height,
        left  : ((windowW() - width) - paddingx*2) / 2,
        top   : ((windowH() - height) - paddingy*2) / 2,
        marginTop : scrollY(),
	paddingLeft:paddingx,
 	paddingRight:paddingx,
 	paddingTop:paddingy,
 	paddingBottom:paddingy,
        opacity:1
    };

    // Trigger the change event
	$('#zoombox').trigger('change',css); 

    // Do we animate or not ?
	if(options.animation == true)
	{	$('#zoombox .title').hide();
		$('#zoombox .container').animate(css,options.duration,function()
		{	if(type == 'multimedia' || isOpen == true)	$('#zoombox .content').append(content);
			else	if(type == 'image' || isOpen == true)	$('#zoombox .content img').css('opacity',0).fadeTo(300,1);
			$('#zoombox .close').fadeIn();
			$('#zoombox .gallery').fadeIn();
			$('#zoombox .title').fadeIn(300);
			state = 'opened'; if(!isOpen) gallery(); isOpen = true;
		});
		
		$('#zoombox .mask').fadeTo(200,options.opacity);
	} else
	{	$('#zoombox .content').append(content);
		$('#zoombox .close').show();
		$('#zoombox .gallery').show();
		$('#zoombox .container').css(css);
		$('#zoombox .mask').show().css('opacity',options.opacity);
		state = 'opened'; if(!isOpen) gallery(); isOpen = true;
	}
}
/**
 * Close the box
 * **/
function close(){
    state = 'closing';
    window.clearInterval(timer);
    $(window).unbind('keydown');
    $(window).unbind('resize'); 
    if(type == 'multimedia'){
        $('#zoombox .container').empty();
    }
    var css = {};
    if(elem != null && elem.find('img').length != 0){
        var min = elem.find('img');
        css ={
            width : min.width(),
            height: min.height(),
            top : min.offset().top,
            left : min.offset().left,
            opacity:0,
            marginTop : min.css('marginTop')
        };
    }else if(elem!=null){
        css = {
           width:   elem.width(),
           height:  elem.height(),
           top:elem.offset().top,
           left:elem.offset().left,
           opacity:0
        };
    }else{
        css = {
            width: 100,
            height: 100,
            top:windowH()/2-50,
            left:windowW()/2-50,
            opacity : 0
        };
    }
    if(options.animation == true){
        $('#zoombox .mask').fadeOut(200);
        $('#zoombox .container').animate(css,options.duration,function(){
            $('#zoombox').remove();
            state = 'closed';
			isOpen = false; 
        });
    }else{
        $('#zoombox').remove();
        state = 'closed';
		isOpen = false; 
    }
}

/**
 * Set the HTML Content of the box
 * */
function setContent(){
    // Overtflow
    if(options.overflow == false){
        if(width*1 + 50 > windowW()){
            height = (windowW() - 50) * height / width;
            width = windowW() - 50;
        }
        if(height*1 + 50 > windowH()){
            width = (windowH()-50) * width / height; 
            height = windowH() - 50;
        }
    }
    var url = link;
    type = 'multimedia';
    if(filtreImg.test(url)){
        type = 'img';
        content='<img src="'+link+'" width="100%" height="100%"/>';
    }else if(filtreMP3.test(url)){
        width=300;
        height=40;
        content ='<object type="application/x-shockwave-flash" data="'+MP3Player+'?son='+url+'" width="'+width+'" height="'+height+'">';
        content+='<param name="movie" value="'+MP3Player+'?son='+url+'" /></object>';
    }else if(filtreFLV.test(url)){
        var autostart = 0;
        if(options.autoplay==true){ autostart = 1; } 
        content='<object type="application/x-shockwave-flash" data="'+zoombox_path+'FLVPlayer.swf" width="'+width+'" height="'+height+'">\
<param name="allowFullScreen" value="true">\
<param name="scale" value="noscale">\
<param name="wmode" value="transparent">\
<param name="flashvars" value="flv='+url+'&autoplay='+autostart+'">\
<embed src="'+zoombox_path+'FLVPlayer.swf" width="'+width+'" height="'+height+'" allowscriptaccess="always" allowfullscreen="true" flashvars="flv='+url+'" wmode="transparent" />\
</object>';
    }else if(filtreSWF.test(url)){
        content='<object width="'+width+'" height="'+height+'"><param name="allowfullscreen" value="true" /><param name="allowscriptaccess" value="always" /><param name="movie" value="'+url+'" /><embed src="'+url+'" type="application/x-shockwave-flash" allowfullscreen="true" allowscriptaccess="always" width="'+width+'" height="'+height+'" wmode="transparent"></embed></object>';
    }else if(filtreQuicktime.test(url)){
        content='<embed src="'+url+'" width="'+width+'" height="'+height+'" controller="true" cache="true" autoplay="true"/>';
        // HTML5 Code
        //content='<video controls src="'+url+'" width="'+width+'" height="'+height+'">Your browser does not support this format</video>'
    }else if(filtreWMV.test(url)){
        content='<embed src="'+url+'" width="'+width+'" height="'+height+'" controller="true" cache="true" autoplay="true" wmode="transparent" />';
    }else if(filtreDailymotion.test(url)){
        var id=url.split('_');
        id=id[0].split('/');
        id=id[id.length-1];
        if(options.autoplay==true){
            id = id + '&autostart=1';
        }
        content='<object width="'+width+'" height="'+height+'"><param name="movie" value="http://www.dailymotion.com/swf/'+id+'&colors=background:000000;glow:000000;foreground:FFFFFF;special:000000;&related=0"></param><param name="allowFullScreen" value="true"></param><param name="allowScriptAccess" value="always"></param><embed src="http://www.dailymotion.com/swf/'+id+'&colors=background:000000;glow:000000;foreground:FFFFFF;special:000000;&related=0" type="application/x-shockwave-flash" width="'+width+'" height="'+height+'" allowFullScreen="true" allowScriptAccess="always" wmode="transparent" ></embed></object>';
    }else if(filtreVimeo.test(url)){
        var id=url.split('/');
        id=id[3];
        if(options.autoplay==true){
            id = id + '&autoplay=1';
        }
        content='<object width="'+width+'" height="'+height+'"><param name="allowfullscreen" value="true" />	<param name="allowscriptaccess" value="always" /><param name="wmode" value="transparent" /><param name="movie" value="http://www.vimeo.com/moogaloop.swf?clip_id='+id+'&amp;server=www.vimeo.com&amp;show_title=1&amp;show_byline=1&amp;show_portrait=1&amp;color=00AAEB&amp;fullscreen=1" />	<embed src="http://www.vimeo.com/moogaloop.swf?clip_id='+id+'&amp;server=www.vimeo.com&amp;show_title=1&amp;show_byline=1&amp;show_portrait=1&amp;color=00AAEB&amp;fullscreen=1" type="application/x-shockwave-flash" allowfullscreen="true" allowscriptaccess="always" width="'+width+'" height="'+height+'" wmode="transparent" ></embed></object>';
    }else if(filtreYoutube.test(url)){
        var id=url.split('watch?v=');
        id=id[1].split('&');
        id=id[0];
        if(options.autoplay==true){
            id = id + '&autoplay=1';
        }
        content='<object width="'+width+'" height="'+height+'"><param name="movie" value="http://www.youtube.com/v/'+id+'&hl=fr&rel=0&color1=0xFFFFFF&color2=0xFFFFFF&hd=1"></param><embed src="http://www.youtube.com/v/'+id+'&hl=fr&rel=0&color1=0xFFFFFF&color2=0xFFFFFF&hd=1" type="application/x-shockwave-flash" width="'+width+'" height="'+height+'" wmode="transparent"></embed></object>';
    }else if(filtreKoreus.test(url)){
        url=url.split('.html');
        url=url[0];
        content='<object type="application/x-shockwave-flash" data="'+url+'" width="'+width+'" height="'+height+'"><param name="movie" value="'+url+'"><embed src="'+url+'" type="application/x-shockwave-flash" width="'+width+'" height="'+height+'"  wmode="transparent"></embed></object>';
    }else{
        content='<iframe src="'+url+'" width="'+width+'" height="'+height+'" border="0"></iframe>';
    }
    return content;
}
/**
 *  Handle Image loading
 **/
function loadImg(img){
    if(img.complete){
            i=0;
            window.clearInterval(timer);
            width=img.width;
            height=img.height;
            $('#zoombox_loader').remove();
            setContent();
            open();
    }
    // On anim le loader
    $('#zoombox_loader').css({'background-position': "0px "+i+"px"});
    i=i-40;
    if(i<(-440)){i=0;}
}

function gotoSlide(i){
    if(state != 'opened'){ return false; }
    position = i;
    elem = imageset[position];
    link = elem.attr('href');
    if($('#zoombox .gallery img').length > 0){
        $('#zoombox .gallery img').removeClass('current');
        $('#zoombox .gallery img:eq('+i+')').addClass('current');
    }
    load();
    return false;
}

function next(){
    i = position+1;
    if(i  > imageset.length-1){
        i = 0;
    }
    gotoSlide(i);
}

function prev(){
    i = position-1;
    if(i < 0){
        i = imageset.length-1;
    }
    gotoSlide(i);
}

/**
 * GENERAL FUNCTIONS
 * */
/**
 * Resize
 **/
function resize(){
    console.log($('#zoombox .container').outerWidth(true));
    $('#zoombox .container').css({
        top : (windowH() - $('#zoombox .container').outerHeight(true)) / 2,
        left : (windowW() - $('#zoombox .container').outerWidth(true)) / 2
    });
}
/**
 * Keyboard Shortcut
 **/
function shortcut(key){
    if(key == 37){
        prev();
    }
    if(key == 39){
        next();
    }
    if(key == 27){
        close();
    }

}
/**
 * Parse Width/Height of a link and insert it in the width and height variables
 * */
function setDim(){
    width = options.width;
    height = options.height;
    if(elem!=null){
        var widthReg = /w([0-9]+)/;
        var w = widthReg.exec(elem.attr("class"));
        if(w != null){
            if(w[1]){
                width = w[1];
            }
        }
        var heightReg = /h([0-9]+)/;
        var h = heightReg.exec(elem.attr("class"));
        if(h != null){
            if(h[1]){
                height = h[1];
            }
        }
    }
    return false;
}
/**
* Return the window height
* */
function windowH(){
        if (window.innerHeight) return window.innerHeight  ;
        else{return $(window).height();}
}

/**
 * Return the window width
 * */
function windowW(){
        if (window.innerWidth) return window.innerWidth  ;
        else{return $(window).width();}
}

/**
 *  Return the position of the top
 *  */
function scrollY() {
        scrOfY = 0;
        if( typeof( window.pageYOffset ) == 'number' ) {
                //Netscape compliant
                scrOfY = window.pageYOffset;
        } else if( document.body && ( document.body.scrollTop ) ) {
                //DOM compliant
                scrOfY = document.body.scrollTop;
        } else if( document.documentElement && ( document.documentElement.scrollTop ) ) {
                //IE6 standards compliant mode
                scrOfY = document.documentElement.scrollTop;
        }
        return scrOfY;
}

/**
 *  Return the position of the left scroll
 *  */
function scrollX(){
        scrOfX = 0;
        if( typeof( window.pageXOffset ) == 'number' ) {
                //Netscape compliant
                scrOfX = window.pageXOffset;
        } else if( document.body && ( document.body.scrollLeft ) ) {
                //DOM compliant
                scrOfX = document.body.scrollLeft;
        } else if( document.documentElement && ( document.documentElement.scrollLeft ) ) {
                //IE6 standards compliant mode
                scrOfX = document.documentElement.scrollLeft;
        }
         return scrOfX;
}

})(jQuery);