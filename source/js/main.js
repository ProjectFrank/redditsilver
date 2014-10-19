//= require_tree "./vendor"
//= require "plugins"

(function() {    
    function decode(phrase) {
	return phrase.replace(/&amp;/g, '&');
    }
    var ajaxActive = false;
    var converter = new Showdown.converter();
    var PostBox = React.createClass({
	displayName: 'PostBox',
	getInitialState: function() {
	    return {posts: []};
	},
	postBank: [],
	withdrawPost: function(numPosts) {
	    var newPosts = [];
	    for (var i = 0; i < numPosts && i < this.postBank.length; i++) {
		newPosts.push(this.postBank.shift());
	    }
	    this.setState({posts: this.state.posts.concat(newPosts)});
	    console.log(this.state.posts.length);
	},
	cleanPosts: function() {
	    this.state.posts.splice(0, 30);
	    this.forceUpdate();
	},
	requestParams: {limit: 100, count: 0},
	loadPosts: function() {
	    ajaxActive = true;
	    $.ajax({
		url: 'http://www.reddit.com/.json?jsonp=?',
		type: 'GET',
		dataType: 'jsonp',
		data: this.requestParams,
		success: function(response) {
		    var regexp = /.(gif|jpg|png)$/;
		    response.data.children.forEach(function(post) {
			if (post.data.url.search(regexp) > 0 && !post.data.over_18) {
			    this.postBank.push(post);
			    this.requestParams.after = post.data.name;
			}
		    }.bind(this));
		    if (this.state.posts.length == 0) {
			this.withdrawPost(5);
		    }
		    this.requestParams.count += 100;
		    ajaxActive = false;
		}.bind(this)
	    });
	},
	componentDidMount: function() {
	    this.loadPosts();
	    $(window).on('scroll', function() {
		if (!ajaxActive) {
		    var $lastPost = $('.post').last().prev();
		    var docViewBottom = $(window).scrollTop() + $(window).height();
		    var lastPostTop = $lastPost.offset().top;
		    if (lastPostTop <= docViewBottom) {
			if (this.postBank.length < 20) {
			    this.loadPosts();
			}
			var newPosts = [];
			this.withdrawPost(2);
			if (this.state.posts.length - 30 > 10) {
			    this.cleanPosts();
			    window.scrollTo(0, $lastPost.offset().top - $(window).height());
			}
		    }
		}
	    }.bind(this));
	},
	render: function() {
	    var postNodes = this.state.posts.map(function(post) {
		return Post({key: post.data.name, url: post.data.url, title: decode(post.data.title), comments: 'http://www.reddit.com' + post.data.permalink + '.json'});
	    });
	    return React.DOM.div({className: 'postbox'}, postNodes);
	}
    });

    // Accordion comment box that expands upon clicking 'show comments'
    var CommentBox = React.createClass({
	displayName: 'CommentBox',
	componentDidUpdate: function() {
	    if (this.props.showComments) {
		TweenLite.to(this.getDOMNode(), 0.5, {height: 'auto'});
	    } else {
		TweenLite.to(this.getDOMNode(), 0.5, {height: 0});
	    }
	},
	// Create comment nodes for top 5 comments at each level for 3 levels
	constructCommentTree: function() {
	    var commentNodes = [];
	    // Iterate through top 
	    for (var i = 0; i < 5 && i < this.props.comments.length; i++) {
		var node = Comment({
		    className: 'level1',
		    text: this.props.comments[i].data.body,
		    author: this.props.comments[i].data.author,
		    votes: this.props.comments[i].data.ups,
		    time: Math.round(((new Date()).getTime() / 1000 - this.props.comments[i].data.created_utc) / 3600)
		},			 
				   this.props.comments[i].data.body);
		commentNodes.push(node);
	    }
	    return commentNodes;
	},
	render: function() {
	    return React.DOM.div({key: this.props.key + 'commentbox', className: 'commentbox'}, this.constructCommentTree());
	}
    });

    var Comment = React.createClass({
	render: function() {
	    var contents = [];
	    var thing = this.props.text.replace(/(^|\s+)(http:\/\/\S+)/gi, ' [$2]($2)');
	    var rawMarkup = converter.makeHtml(thing);
	    contents.push(React.DOM.span({className: 'author'}, this.props.author));
	    if (this.props.votes) {
		contents.push(React.DOM.span({className: 'votes'}, this.props.votes + ' points'));
	    }
	    contents.push(React.DOM.span({className: 'hours'}, this.props.time + ' hours'));
	    contents.push(React.DOM.div({dangerouslySetInnerHTML: {__html: rawMarkup}}));
	    return React.DOM.div({className: 'comment clearfix'}, contents);
	}
    });

    var Post = React.createClass({
	getInitialState: function() {
	    return {showComments: false, comments: []};
	},
	displayName: 'Post',
	render: function() {
	    var contents = [];
	    contents.push(React.DOM.h2(null, this.props.title));
	    contents.push(React.DOM.a({href: this.props.url, target: '_blank'},
				      React.DOM.img({src: this.props.url})
				     )
			 );
	    var commentToggle = 'show comments';
	    if (this.state.showComments) {
		commentToggle = 'hide comments';
	    }
	    contents.push(React.DOM.a({onClick: this.handleClick, ref: 'CommentToggle'}, commentToggle));
	    contents.push(CommentBox({key: this.props.key, comments: this.state.comments, showComments: this.state.showComments}));
	    return React.DOM.div({className: 'post'}, contents);
	},
	loadCommentsFromServer: function() {
	    $.ajax({
		url: this.props.comments + '?jsonp=?',
		type: 'GET',
		dataType: 'jsonp',
		success: function(response) {
		    this.setState({
			showComments: true,
			comments: response[1].data.children
		    });
		    
		}.bind(this)
	    });	    
	},
	handleClick: function() {
	    if (!this.state.showComments) {
		if (this.state.comments.length == 0) {
		    this.loadCommentsFromServer();
		} else {
		    this.setState({showComments: true});
		}
	    } else {
		this.setState({showComments: false});
	    }
	}
    });
    React.renderComponent(PostBox(), document.getElementById('content'));
})();

