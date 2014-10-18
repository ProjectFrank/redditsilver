(function() {    
    var PostBox = React.createClass({
	displayName: 'PostBox',
	getInitialState: function() {
	    return {posts: [], requestParams: {limit: 100}};
	},
	loadPosts: function() {
	    $.ajax({
		url: 'http://www.reddit.com/.json?jsonp=?',
		type: 'GET',
		dataType: 'jsonp',
		data: this.state.requestParams,
		success: function(response) {
		    var regexp = /.(gif|jpg|png)$/;
		    var thing = [];
		    response.data.children.forEach(function(post) {
			if (post.data.url.search(regexp) > 0) {
			    thing.push(post);
			}
		    });
		    var nextState = React.addons.update(this.state, {$merge: {
			requestParams: {
			    after: response.data.children[0].name
			},
			posts: thing	
		    }
								    });
		    this.setState(nextState);
		}.bind(this)
	    });
	},
	componentDidMount: function() {
	    this.loadPosts();
	},
	render: function() {
	    var postNodes = this.state.posts.map(function(post) {
		return Post({key: post.data.name, url: post.data.url, title: post.data.title, comments: 'http://www.reddit.com' + post.data.permalink});
	    });
	    return React.DOM.div({className: 'postbox'}, postNodes);
	}
    });
	
    // });
    var Post = React.createClass({
	getInitialState: function() {
	    return {showComments: false};
	},
	render: function() {
	    return React.DOM.div({className: 'post'},
				 React.DOM.h2(null, this.props.title),
				 React.DOM.img({src: this.props.url}),
				 React.DOM.a({href: this.props.comments}, 'comments')
				);
	}
    });

    $.ajax({
	url: 'http://www.reddit.com/hot.json?jsonp=?',
	dataType: 'jsonp',
	type: 'GET',
	success: function(result) {
	    console.log(result)
	}	
    });

    React.renderComponent(PostBox(), document.getElementById('content'));
})();

