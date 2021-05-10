#!/usr/bin/env python
# -*- coding: utf-8 -*- #

AUTHOR = 'Donghao Zhou'
SITENAME = "Correr's Blog"
SITEURL = ''

PATH = 'content'

TIMEZONE = 'Asia/Shanghai'

DEFAULT_LANG = 'en'

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

# Blogroll
LINKS = (('Pelican', 'https://getpelican.com/'),
         ('Python.org', 'https://www.python.org/'),
         ('Jinja2', 'https://palletsprojects.com/p/jinja/'),
         ('You can modify those links in your config file', '#'),)

# Social widget
SOCIAL = (('You can add links in your config file', '#'),
          ('Another social link', '#'),)

DEFAULT_PAGINATION = 10

# Uncomment following line if you want document-relative URLs when developing
#RELATIVE_URLS = True

THEME = './themes/voce/'                          # make sure path points to folder where you cloned the theme
DEFAULT_DATE_FORMAT = "%b %d, %Y"                 # short date format, optional but recommended 
USER_LOGO_URL = "http://i.imgur.com/zzCRZUH.jpg"  # change URL to point to desired logo for site

