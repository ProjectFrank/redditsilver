//= require_tree "./vendor"
//= require "plugins"

(function() {    
    function decode(phrase) {
	return phrase.replace(/&amp;/g, '&');
    }

    function arrayCopy(array) {
	return array.slice();
    }

    function hoursElapsed(redditTime) {
	return Math.round(((new Date()).getTime() / 1000 - redditTime) / 3600);
    }
    
    var ajaxActive = false;
    var converter = new Showdown.converter();
    var PostBox = React.createClass({
	displayName: 'PostBox',
	getInitialState: function() {
	    return {posts: []};
	},
	postBank: [],
	cleanedPosts: [],
	uncleanPost: function(newState, numPosts) {
	    for (var i = 0; i < numPosts && this.cleanedPosts.length > 0; i++) {
		newState.unshift(this.cleanedPosts.pop());
	    }
	},
	depositPost: function(newState, numPosts) {
	    for (var i = 0; i < numPosts && newState.length > 0; i++) {
		this.postBank.unshift(newState.pop());
	    }
	},
	withdrawPost: function(newState, numPosts) {
	    for (var i = 0; i < 2 && this.postBank.length > 0; i++) {
		newState.push(this.postBank.shift());
	    }
	},	
	cleanPost: function(newState, numPosts) {
	    for (var i = 0; i < 2 && newState.length > 0; i++) {
		this.cleanedPosts.push(newState.shift());
	    }
	},
	requestParams: {limit: 100, count: 0},
	loadPosts: function() {
	    ajaxActive = true;
	    $.ajax({
		url: 'http://www.reddit.com/user/redditsilverwebapp/m/redditsilver/.json?jsonp=?',
		type: 'GET',
		dataType: 'jsonp',
		data: this.requestParams,
		success: function(response) {
		    var regexp = /\.(gif|jpg|png)$/;
		    response.data.children.forEach(function(post) {
			if (post.data.url.search(regexp) > 0 && !post.data.over_18) {
			    var newPost = Post({key: post.data.name, url: post.data.url, title: decode(post.data.title), subreddit: post.data.subreddit, domain: post.data.domain, author: post.data.author, time: hoursElapsed(post.data.created_utc), comments: 'http://www.reddit.com' + post.data.permalink + '.json'});
			    this.postBank.push(newPost);
			    this.requestParams.after = post.data.name;
			}
		    }.bind(this));
		    if (this.state.posts.length == 0) {
			var newState = arrayCopy(this.state.posts);
			this.withdrawPost(newState, 5);
			this.replaceState({posts: newState});
		    }
		    this.requestParams.count += 100;
		    ajaxActive = false;
		}.bind(this)
	    });
	},
	componentDidMount: function() {
	    this.loadPosts();
	    var lastScrollTop = 0;
	    $(window).on('scroll', function() {
		// If scrolling down
		if ($(window).scrollTop() > lastScrollTop) {
		    var $lastPost;
		    if (($lastPost=$('.post').last().prev()).length > 0) {
			var docViewBottom = $(window).scrollTop() + $(window).height();
			var lastPostTop = $lastPost.offset().top;

			// If top of second last post scrolled into view
			if (lastPostTop <= docViewBottom) {
			    if (this.postBank.length < 20 && !ajaxActive) {
				this.loadPosts();
			    }

			    var newState = arrayCopy(this.state.posts);
			    
			    // Withdraw 2 posts.
			    this.withdrawPost(newState, 2);

			    // Clean 2 posts.
			    if (newState.length > 7) {
				this.cleanPost(newState, 2);
				this.replaceState({posts: newState});
				window.scroll(0, $lastPost.offset().top - $(window).height());
			    } else {
				this.replaceState({posts: newState});
			    }
			}
		    }		    
		}
		// If scrolling up
		else {
		    var $secondPost;
		    if (($secondPost = $('.post').first().next()).length > 0) {
			var $secondPost = $('.post').first().next();
			var docViewTop = $(window).scrollTop();
			var secondPostBottom = $secondPost.offset().top + $secondPost.height();
			// If bottom of second post scrolled into view
			if (secondPostBottom >= docViewTop) {
			    var newState = arrayCopy(this.state.posts);
			    this.uncleanPost(newState, 2);
			    if (newState.length > 7) {
				this.depositPost(newState, 2);
				this.replaceState({posts: newState});
				window.scroll(0, $secondPost.offset().top + $secondPost.height());
			    } else {
				this.replaceState({posts: newState});
			    }
			}
		    }
		}

		// Update lastScrollTop
		lastScrollTop = $(window).scrollTop();
	    }.bind(this));
	},
	render: function() {
	    return React.DOM.div({className: 'postbox'}, this.state.posts);
	}
    });

    // Accordion comment box that expands upon clicking 'show comments'
    var CommentBox = React.createClass({
	displayName: 'CommentBox',
	componentDidUpdate: function() {
	    if (this.props.showComments) {
		TweenLite.to(this.getDOMNode(), 1, {height: '500', ease: Bounce.easeOut});
	    } else {
		TweenLite.to(this.getDOMNode(), 1, {height: 0, ease: Bounce.easeOut});
	    }
	},
	// Create comment nodes for top 5 comments at each level for 3 levels
	constructCommentTree: function() {
	    var commentNodes = [];
	    // Iterate through top 
	    for (var i = 0; i < 10 && i < this.props.comments.length; i++) {
		var node = Comment({
		    className: 'level1',
		    key: this.props.comments[i].id,
		    text: this.props.comments[i].data.body,
		    author: this.props.comments[i].data.author,
		    votes: this.props.comments[i].data.ups,
		    time: hoursElapsed(this.props.comments[i].data.created_utc)
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
	    var thing2 = converter.makeHtml(thing);
	    var rawMarkup = thing2.replace(/(href=)/gi, 'target="_blank" $1');
	    contents.push(React.DOM.a({className: 'author', href: 'http://reddit.com/u/'+this.props.author, target: '_blank'}, this.props.author));
	    if (this.props.votes) {
		contents.push(React.DOM.span({className: 'votes'}, this.props.votes + ' points'));
	    }
	    contents.push(React.DOM.span({className: 'hours'}, this.props.time + 'h'));
	    contents.push(React.DOM.div({dangerouslySetInnerHTML: {__html: rawMarkup}}));
	    return React.DOM.div({className: 'comment'}, contents);
	}
    });

    var Post = React.createClass({
	getInitialState: function() {
	    return {showComments: false, comments: [], loadingComments: false};
	},
	displayName: 'Post',
	render: function() {
	    var contents = [];
	    contents.push(React.DOM.h2({key: this.props.key + 0}, this.props.title));
	    contents.push(React.DOM.div({key: this.props.key + 1, className: 'info clearfix'},
					React.DOM.a({className: 'subreddit',
						     href: 'http://reddit.com/r/' + this.props.subreddit,
						     target: '_blank'
						    }, '/r/' + this.props.subreddit),
					React.DOM.span({className: 'time'}, this.props.time + 'h'),
					React.DOM.a({className: 'uploader',
						     href: 'http://reddit.com/u/' + this.props.author,
						     target: '_blank'
						    }, '/u/' + this.props.author)
				       )
			 );
	    contents.push(React.DOM.a({key: this.props.key + 2, href: this.props.url, target: '_blank'},
				      React.DOM.img({src: this.props.url}))
			 );
	    var commentToggle = 'show comments';
	    if (this.state.showComments) {
		commentToggle = 'hide comments';
	    }
	    if (!this.state.loadingComments) {
		contents.push(React.DOM.a({key: this.props.key + 3, className: 'comment-toggle', onClick: this.handleClick, ref: 'CommentToggle'}, commentToggle));	
	    } else {
		contents.push(React.DOM.a({key: this.props.key + 4, className: 'comment-toggle', ref: 'CommentToggle'},
					  commentToggle,
					  React.DOM.div({className: 'loader', dangerouslySetInnerHTML: {__html: '<svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"width="40px" height="40px" viewBox="0 0 50 50" style="enable-background:new 0 0 50 50;" xml:space="preserve"><path fill="#000" d="M43.935,25.145c0-10.318-8.364-18.683-18.683-18.683c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615c8.072,0,14.615,6.543,14.615,14.615H43.935z"><animateTransform attributeType="xml"attributeName="transform"type="rotate"from="0 25 25"to="360 25 25"dur="0.6s"repeatCount="indefinite"/></path></svg>'}})));				
	    }

	    contents.push(CommentBox({key: this.props.key, comments: this.state.comments, showComments: this.state.showComments}));
	    return React.DOM.div({className: 'post'}, contents);
	},
	loadCommentsFromServer: function() {
	    this.setState({loadingComments: true});
	    $.ajax({
		url: this.props.comments + '?sort=hot&jsonp=?',
		type: 'GET',
		dataType: 'jsonp',
		success: function(response) {
		    this.setState({
			showComments: true,
			comments: response[1].data.children,
			loadingComments: false
		    });
		    
		}.bind(this),
		error: function() {
		    this.setState({
			showComments: false,
			loadingComments: false
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
    React.renderComponent(PostBox({sub: ''}), document.getElementById('content'));
})();
