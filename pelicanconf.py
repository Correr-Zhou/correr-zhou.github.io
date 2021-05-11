#!/usr/bin/env python
# -*- coding: utf-8 -*- #

AUTHOR = 'Correr Zhou'
SITENAME = "Correr's Blog"
SITEURL = ''
PATH = 'content'
TIMEZONE = 'Asia/Shanghai'
DEFAULT_LANG = 'Chinese (Simplified)'
DEFAULT_PAGINATION = 8

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

# 链接与媒体
LINKS = (('Home', '/index.html'),
         ('Works', '/pages/works.html'),
         ('milestones', '/pages/milestones.html'),
         ('About me', '/pages/about-me.html'),)
SOCIAL = (('Search', 'https://www.bing.com/search?q=site%3Acorrer-zhou.github.io'),
          ('Email', 'mailto:dh.zhou@siat.ac.cn'),
          ('Linkedin', 'https://www.linkedin.com/in/%E5%86%AC%E8%B1%AA-%E5%91%A8-663173212/'),
          ('Github', 'https://github.com/Correr-Zhou'),)

# 主题
THEME = './themes/voce/'

# 插件

# 页面布置
USER_LOGO_NAME = "user_logo.png"
DEFAULT_DATE_FORMAT = "%Y-%m-%d"                 # short date format, optional but recommended

# 文档路径
ARCHIVES_URL = "archives.html"
ARCHIVES_SAVE_AS = 'archives.html'
ARTICLE_URL = 'articles/{slug}.html'
ARTICLE_SAVE_AS = 'articles/{slug}.html'
PAGE_URL = 'pages/{slug}.html'
PAGE_SAVE_AS = 'pages/{slug}.html'
TAGS_URL = 'tag/{slug}.html'
AUTHOR_SAVE_AS = ''
AUTHORS_SAVE_AS = ''
CATEGORY_SAVE_AS = ''
CATEGORIES_SAVE_AS = ''

# Uncomment following line if you want document-relative URLs when developing
# RELATIVE_URLS = True

"""
JINJA_ENVIRONMENT = {'trim_blocks': True, 'lstrip_blocks': True}
JINJA_FILTERS = {}
MARKDOWN = {
    'extension_configs': {
        'markdown.extensions.codehilite': {'css_class': 'highlight'},
        'markdown.extensions.extra': {},
        'markdown.extensions.meta': {},
    },
    'output_format': 'html5',
}
PLUGINS = None
PLUGIN_PATHS = []
STATIC_PATHS = ['images']
SUMMARY_MAX_LENGTH = 50
SUMMARY_END_SUFFIX = '…'
DRAFT_URL = 'drafts/{slug}.html'
DRAFT_SAVE_AS = 'drafts/{slug}.html'
"""
