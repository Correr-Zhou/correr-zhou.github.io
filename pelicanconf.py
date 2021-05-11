#!/usr/bin/env python
# -*- coding: utf-8 -*- #

AUTHOR = 'Donghao Zhou'
SITENAME = "Home - Correr's Blog"
SITEURL = ''
PATH = 'content'
TIMEZONE = 'Asia/Shanghai'
DEFAULT_LANG = 'en'
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
USER_LOGO_URL = "https://i.loli.net/2021/05/10/HKRbhiUw7tsk8NT.png"
DEFAULT_DATE_FORMAT = "%b %d, %Y"                 # short date format, optional but recommended

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
