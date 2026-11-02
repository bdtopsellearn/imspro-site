import {
    r as e
} from "./mapp-_ZvHbzIw.js";
import {
    h as t,
    t as n
} from "./mapp-Do8coFm2.js";
import {
    a as r,
    i,
    r as a
} from "./mapp-WAYq8zpi.js";
var o = e(t(), 1),
    s = n(),
    c = `
  .ui-grid { display: grid; grid-template-columns: 110px 1fr; gap: 8px 14px; font-size: 13px; }
  .ui-grid .k { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; align-self: center; }
  .ui-grid .v { color: var(--text-primary); word-break: break-word; }
  .ui-grid .v code { font-family: ui-monospace, monospace; font-size: 11px; color: var(--accent); }
  .ui-pill {
    display: inline-block; padding: 2px 8px; border-radius: 6px;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    background: rgba(255,255,255,0.06); color: var(--text-secondary);
  }
  .ui-section-label {
    font-size: 11px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    margin: 18px 0 10px;
  }
  .ui-sid-list { display: flex; flex-direction: column; gap: 6px; }
  .ui-sid-row {
    display: grid; grid-template-columns: 1fr 60px 56px; align-items: center;
    gap: 12px; font-size: 12px;
  }
  .ui-sid-name { color: var(--text-primary); font-weight: 600; }
  .ui-sid-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .ui-sid-bar {
    flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;
  }
  .ui-sid-bar > i {
    display: block; height: 100%; background: var(--accent);
    border-radius: 3px;
  }
  .ui-sid-count { color: var(--text-muted); font-family: ui-monospace, monospace; font-size: 11px; text-align: right; }
  .ui-sid-pct  { color: var(--accent); font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; text-align: right; }
  .ui-sid-row.other .ui-sid-bar > i { background: var(--text-muted); }
  .ui-sid-row.other .ui-sid-pct { color: var(--text-muted); }
  .ui-empty { padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px; }
`;

function l(e) {
    return e ? new Date(e).toLocaleString(void 0, {
        dateStyle: `medium`,
        timeStyle: `short`
    }) : `—`
}

function u({
    uid: e,
    onClose: t
}) {
    let [n, u] = (0, o.useState)(null), [d, f] = (0, o.useState)(!0), [p, m] = (0, o.useState)(``);
    return (0, o.useEffect)(() => {
        let t = !0;
        return f(!0), m(``), r(`/@dashboard/admin/upayment/user-info`, {
            uid: e
        }).then(e => {
            t && (a(e) && e.data ? u(e.data) : m(e.message || `Failed to load`))
        }).catch(() => t && m(`Network error`)).finally(() => t && f(!1)), () => {
            t = !1
        }
    }, [e]), (0, s.jsxs)(`div`, {
        className: `au-modal-bd`,
        onClick: t,
        children: [(0, s.jsx)(`style`, {
            children: c
        }), (0, s.jsxs)(`div`, {
            className: `au-modal`,
            onClick: e => e.stopPropagation(),
            children: [(0, s.jsxs)(`div`, {
                className: `au-modal-head`,
                children: [(0, s.jsxs)(`div`, {
                    children: [(0, s.jsxs)(`h3`, {
                        children: [(0, s.jsx)(i, {
                            name: `user`,
                            style: {
                                color: `#06b6d4`,
                                marginRight: 8
                            }
                        }), ` User Info`]
                    }), (0, s.jsxs)(`div`, {
                        className: `meta`,
                        children: [`UID: `, e]
                    })]
                }), (0, s.jsx)(`button`, {
                    className: `au-modal-close`,
                    onClick: t,
                    children: (0, s.jsx)(i, {
                        name: `times`
                    })
                })]
            }), (0, s.jsxs)(`div`, {
                className: `au-modal-body`,
                children: [d && (0, s.jsx)(`div`, {
                    className: `ui-empty`,
                    children: (0, s.jsx)(i, {
                        name: `circle-notch`,
                        style: {
                            color: `var(--accent)`,
                            fontSize: 22
                        }
                    })
                }), !d && p && (0, s.jsx)(`div`, {
                    className: `ui-empty`,
                    style: {
                        color: `#ef4444`
                    },
                    children: p
                }), !d && !p && n && (0, s.jsxs)(s.Fragment, {
                    children: [(0, s.jsxs)(`div`, {
                        className: `ui-grid`,
                        children: [(0, s.jsx)(`div`, {
                            className: `k`,
                            children: `Name`
                        }), `     `, (0, s.jsx)(`div`, {
                            className: `v`,
                            children: n.username
                        }), (0, s.jsx)(`div`, {
                            className: `k`,
                            children: `Email`
                        }), `    `, (0, s.jsx)(`div`, {
                            className: `v`,
                            children: (0, s.jsx)(`code`, {
                                children: n.email
                            })
                        }), n.phone && (0, s.jsxs)(s.Fragment, {
                            children: [(0, s.jsx)(`div`, {
                                className: `k`,
                                children: `Phone`
                            }), `  `, (0, s.jsx)(`div`, {
                                className: `v no-mask`,
                                children: (0, s.jsx)(`code`, {
                                    children: n.phone
                                })
                            })]
                        }), (0, s.jsx)(`div`, {
                            className: `k`,
                            children: `Role`
                        }), `     `, (0, s.jsx)(`div`, {
                            className: `v`,
                            children: (0, s.jsx)(`span`, {
                                className: `ui-pill`,
                                children: n.role
                            })
                        }), (0, s.jsx)(`div`, {
                            className: `k`,
                            children: `Status`
                        }), `   `, (0, s.jsx)(`div`, {
                            className: `v`,
                            children: (0, s.jsx)(`span`, {
                                className: `ui-pill`,
                                children: n.account_status
                            })
                        }), (0, s.jsx)(`div`, {
                            className: `k`,
                            children: `Balance`
                        }), `  `, (0, s.jsxs)(`div`, {
                            className: `v`,
                            children: [`$`, n.balance.toFixed(4)]
                        }), n.teamlead && (0, s.jsxs)(s.Fragment, {
                            children: [(0, s.jsx)(`div`, {
                                className: `k`,
                                children: `Team lead`
                            }), (0, s.jsxs)(`div`, {
                                className: `v`,
                                children: [n.teamlead, ` `, (0, s.jsxs)(`span`, {
                                    style: {
                                        color: `var(--text-muted)`,
                                        fontSize: 11
                                    },
                                    children: [`(`, n.teamlead_uid, `)`]
                                })]
                            })]
                        }), (0, s.jsx)(`div`, {
                            className: `k`,
                            children: `Joined`
                        }), `    `, (0, s.jsx)(`div`, {
                            className: `v`,
                            children: l(n.created_at)
                        }), (0, s.jsx)(`div`, {
                            className: `k`,
                            children: `Last login`
                        }), (0, s.jsx)(`div`, {
                            className: `v`,
                            children: l(n.last_login_at)
                        })]
                    }), (0, s.jsxs)(`div`, {
                        className: `ui-section-label`,
                        children: [`SID Mix · last `, n.sid_window_days, ` days · `, n.sid_total, ` successful hits`]
                    }), n.sid_total === 0 ? (0, s.jsx)(`div`, {
                        className: `ui-empty`,
                        children: `No successful hits in this window.`
                    }) : (0, s.jsxs)(`div`, {
                        className: `ui-sid-list`,
                        children: [n.sids.map(e => (0, s.jsxs)(`div`, {
                            className: `ui-sid-row`,
                            children: [(0, s.jsx)(`div`, {
                                className: `ui-sid-name`,
                                children: e.sid
                            }), (0, s.jsx)(`div`, {
                                className: `ui-sid-bar-wrap`,
                                children: (0, s.jsx)(`div`, {
                                    className: `ui-sid-bar`,
                                    children: (0, s.jsx)(`i`, {
                                        style: {
                                            width: `${Math.max(2,e.pct)}%`
                                        }
                                    })
                                })
                            }), (0, s.jsxs)(`div`, {
                                className: `ui-sid-pct`,
                                children: [e.pct.toFixed(1), `%`]
                            })]
                        }, e.sid)), n.sid_other && n.sid_other.count > 0 && (0, s.jsxs)(`div`, {
                            className: `ui-sid-row other`,
                            children: [(0, s.jsx)(`div`, {
                                className: `ui-sid-name`,
                                style: {
                                    color: `var(--text-muted)`
                                },
                                children: `Other`
                            }), (0, s.jsx)(`div`, {
                                className: `ui-sid-bar-wrap`,
                                children: (0, s.jsx)(`div`, {
                                    className: `ui-sid-bar`,
                                    children: (0, s.jsx)(`i`, {
                                        style: {
                                            width: `${Math.max(2,n.sid_other.pct)}%`
                                        }
                                    })
                                })
                            }), (0, s.jsxs)(`div`, {
                                className: `ui-sid-pct`,
                                children: [n.sid_other.pct.toFixed(1), `%`]
                            })]
                        })]
                    })]
                }), (0, s.jsx)(`button`, {
                    onClick: t,
                    className: `btn btn-ghost btn-sm`,
                    style: {
                        width: `100%`,
                        justifyContent: `center`,
                        marginTop: 16
                    },
                    children: `Close`
                })]
            })]
        })]
    })
}
export {
    u as
    default
};