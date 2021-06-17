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
LINKS = (('Home', '/'),
         ('Archives', '/archives.html'),
         ('Works', '/pages/works.html'),
         ('About me', '/pages/about-me.html'),)
SOCIAL = (('Message Board', '/pages/message-board.html'),
          ('Search', 'https://www.bing.com/search?q=site%3Acorrer-zhou.github.io'),
          ('E-mail', 'mailto:dh.zhou@siat.ac.cn'),
          ('Linkedin', 'https://www.linkedin.com/in/%E5%86%AC%E8%B1%AA-%E5%91%A8-663173212/'),
          ('Github', 'https://github.com/Correr-Zhou'),)

# 主题
THEME = 'themes/voce/'

# 插件

# 页面布置
USER_LOGO_NAME = 'user_logo.png'
DEFAULT_DATE_FORMAT = '%Y-%m-%d'

# 文档路径
ARCHIVES_URL = 'archives.html'
ARCHIVES_SAVE_AS = 'archives.html'
ARTICLE_URL = 'articles/{slug}.html'
ARTICLE_SAVE_AS = 'articles/{slug}.html'
DRAFT_URL = 'drafts/{slug}.html'
DRAFT_SAVE_AS = 'drafts/{slug}.html'
PAGE_URL = 'pages/{slug}.html'
PAGE_SAVE_AS = 'pages/{slug}.html'
TAGS_URL = 'tag/{slug}.html'
AUTHOR_SAVE_AS = ''
AUTHORS_SAVE_AS = ''
CATEGORY_SAVE_AS = ''
CATEGORIES_SAVE_AS = ''

# 其他配置
DELETE_OUTPUT_DIRECTORY = True
STATIC_PATHS = ['images', '.nojekyll']
PLUGIN_PATHS = ['plugins']
PLUGINS = ['render_math', 'post_stats', 'related_posts']
RELATED_POSTS_MAX = 5
MARKDOWN = {
    'extension_configs': {
        'markdown.extensions.codehilite': {
            'css_class': 'highlight',
            'linenums': True,
        },
        'markdown.extensions.extra': {},
        'markdown.extensions.meta': {},
        'markdown.extensions.smarty': {},
        'markdown.extensions.wikilinks': {},
        'markdown.extensions.toc': {
            'title': '本文目录',
            'toc_depth': 3,
        },
    },
    'output_format': 'html5',
}
# USE_FOLDER_AS_CATEGORY = True

# Uncomment following line if you want document-relative URLs when developing
# RELATIVE_URLS = True
