exports.getIndex = (req, res) => {
    res.render('home/index', {
        title: 'Home'
    });
};

exports.getAbout = (req, res) => {
    res.render('home/about', {
        title: 'About Us'
    });
};

exports.getContact = (req, res) => {
    res.render('home/contact', {
        title: 'Contact Us'
    });
};

exports.postContact = (req, res) => {
    // Simple contact form handler
    const { name, email, subject, message } = req.body;
    
    // In a real app, send email or save message
    req.flash('success_msg', `Thank you ${name}, your message has been received!`);
    res.redirect('/contact');
};
