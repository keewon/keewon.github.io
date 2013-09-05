---
layout: post
title: Tsung tips
date: 2013-02-15
categories: work erlang
---

If you want to do load test on XMPP server, there are not many ready-made choices.
[Tsung](http://tsung.erlang-projects.org) is one of them, which is well maintained.

But Tsung is not easy to use.
Even though it looks like Tsung running well, you need to check logs and log file size
to check all clients are running.

Fortunately [Tsung FAQ](http://tsung.erlang-projects.org/user_manual.html#htoc82)
presents trouble shooting guide.
If clustering doesn't work well, you need to check connectivity of each nodes.
Each nodes are connected via ssh as far as I know. PATH also should be set properly.

If you want to test custom XMPP protocols,
you may edit `ts_jabber_common.erl` and recompile the project.  
After recompiling it, you need to distribute binary to all clients.
