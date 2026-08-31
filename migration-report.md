# LinkAdda Media Migration Report: Supabase -> RustFS S3

**Generated At:** 1/9/2026, 12:05:22 am (UTC: 2026-08-31T18:35:22.384Z)
**Target Endpoint:** `https://s3.linkadda.shop`
**Target Bucket:** `linkadda-media`
**Execution Mode:** LIVE MIGRATION

## Summary Metrics

| Metric | Count |
| :--- | :--- |
| **Total Files Audited** | **119** |
| Images | 116 |
| Videos | 3 |
| **Successfully Prepared & Dual-Mapped** | **119** |
| S3 Direct Uploads | 0 |
| Skipped (Already in RustFS) | 0 |
| Queued for Remote Sync | 119 |

## Failures / Ingestion Status Breakdown

- **`products/1786559378617_asset_16zgyf0.jpg`** (ID: `media_00ahqv7`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786565494317_asset_ojm04z3.jpg`** (ID: `media_03v1l9o`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786568974199_asset_d438ecc.jpg`** (ID: `media_0jxbyic`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786602935813_asset_qfwqsmo.jpg`** (ID: `media_0ma2lpc`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786561411696_asset_s9bq04a.jpg`** (ID: `media_11ksq8x`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563893203_asset_x2sl3h2.jpg`** (ID: `media_16nl0qt`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562593692_asset_0af3mdw.jpg`** (ID: `media_1kpsmfc`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563887570_asset_dgdyngk.jpg`** (ID: `media_1kupqsq`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564805356_asset_gk1kivo.jpg`** (ID: `media_1se0nk8`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786566562786_asset_swz5y2u.jpg`** (ID: `media_1x881u2`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786553766963_asset_z7rdops.jpg`** (ID: `media_215lzar`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`logos/binance.png`** (ID: `media_40f13dd2e0c871c0`): @aws-sdk XML parse error: unexpected content.
  Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.
- **`products/1786559908671_asset_1ovcacz.jpg`** (ID: `media_40quduq`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786603106521_asset_8y8np2i.jpg`** (ID: `media_44gh6o1`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564357659_asset_suugmxg.jpg`** (ID: `media_4c19z3a`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786562156754_asset_qqxkrpv.jpg`** (ID: `media_4po2xqi`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786566160024_asset_7tpmsqe.jpg`** (ID: `media_4vek80j`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786603327991_asset_37i8dyg.jpg`** (ID: `media_5sl1edi`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`logos/upi-icon.png`** (ID: `media_6092d77cae466d67`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561459218_asset_dhbkf9w.jpg`** (ID: `media_619gxw4`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562583348_asset_bzy2vww.jpg`** (ID: `media_6e694zn`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786563875828_asset_n1ywj0v.jpg`** (ID: `media_74tyalx`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786564782116_asset_w0ebv5q.jpg`** (ID: `media_75o5ea6`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786566350683_asset_sitj574.jpg`** (ID: `media_7m21ckr`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564359573_asset_y2zpjsb.jpg`** (ID: `media_8a5l5ci`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563890316_asset_kjkii2d.jpg`** (ID: `media_8ba9ubw`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564612066_asset_lq94u6j.jpg`** (ID: `media_8g6t26u`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786566251088_asset_pa989ea.jpg`** (ID: `media_8j4bmbh`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786559944318_asset_64ekey4.jpg`** (ID: `media_9lrlruv`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562591911_asset_s94ov5i.jpg`** (ID: `media_9q9qqi4`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`logos/paypal.jpg`** (ID: `media_a0afea9e4ec2fe00`): @aws-sdk XML parse error: unexpected content.
  Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.
- **`products/gallery/1786565492774_asset_l8xbplt.jpg`** (ID: `media_a7qski1`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562263718_asset_0woosc0.jpg`** (ID: `media_a96wm1h`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1787843551886_asset_ggrlssh.jpg`** (ID: `media_au2r1rg`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786564125799_asset_4a4356o.jpg`** (ID: `media_b8wjzmn`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786565220861_asset_at2cupw.jpg`** (ID: `media_cttaatq`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786559948380_asset_22bvj80.jpg`** (ID: `media_daqymr0`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786561834798_asset_gkaproq.jpg`** (ID: `media_ddafdsi`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563508451_asset_3ocnq65.jpg`** (ID: `media_dmdd20t`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786569554801_asset_8uisgz4.jpg`** (ID: `media_dy62zp1`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564803105_asset_8sjbvml.jpg`** (ID: `media_e3e8ici`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786603623622_asset_dkl2o68.jpg`** (ID: `media_ekobd4k`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1787843570859_asset_ser9ztb.jpg`** (ID: `media_epkgrjt`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786602696167_asset_gvqublh.jpg`** (ID: `media_ezfogwf`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561860244_asset_i4efi9a.jpg`** (ID: `media_fq8zg04`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786558732127_asset_blvd8jc.jpg`** (ID: `media_g6sfo4a`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561466968_asset_xll21gr.jpg`** (ID: `media_g6zzdcj`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562589040_asset_ylqusva.jpg`** (ID: `media_ggufiih`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561430448_asset_hpgzwnw.jpg`** (ID: `media_gicmav7`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786553772931_asset_niwjeut.jpg`** (ID: `media_gyzxok7`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786563493537_asset_utojrah.jpg`** (ID: `media_haxbelg`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786564605544_asset_hswtiki.jpg`** (ID: `media_hr0upcp`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786558763591_asset_4ilddx6.mp4`** (ID: `media_iev4g2v`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562273716_asset_8myhepk.jpg`** (ID: `media_j5nk4jh`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786568792542_asset_0g6cdzw.jpg`** (ID: `media_jl5arat`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1787843572298_asset_lw6o5h8.jpg`** (ID: `media_jmfx46l`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`hero/1787109566056_asset_ogz30q0.jpg`** (ID: `media_jv3bke9`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786553769439_asset_emjecvr.jpg`** (ID: `media_jymripl`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786565214035_asset_r2vs4wk.jpg`** (ID: `media_khwf5qd`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786569243428_asset_1peiy2z.jpg`** (ID: `media_kvd8nmh`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564354688_asset_pbxpdz2.jpg`** (ID: `media_kwz47sf`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786558734788_asset_zn7jrmn.jpg`** (ID: `media_kxr58dl`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786602691180_asset_v42rqjo.jpg`** (ID: `media_l8yyvvd`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786603100188_asset_mjysqbk.jpg`** (ID: `media_levawqy`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786558705877_asset_3nuf32c.jpg`** (ID: `media_lnkvrkm`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786962376948_asset_f1wjn90.jpg`** (ID: `media_lunbyjg`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786559920584_asset_rbxrrhm.mp4`** (ID: `media_m2fqyv4`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`categories/1786480353710_asset_thz20r2.jpg`** (ID: `media_m9n4cro`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786565219304_asset_ygsx8q7.jpg`** (ID: `media_mvduas9`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786558740536_asset_4rdjltt.jpg`** (ID: `media_n096f0p`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561854019_asset_kmhj6vw.jpg`** (ID: `media_n1yuimm`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786602940467_asset_h3r5ujy.jpg`** (ID: `media_nf436hs`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786553779517_asset_icflcbi.jpg`** (ID: `media_nj13ivu`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786565222671_asset_sqwmymr.jpg`** (ID: `media_nj2bqn0`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561464100_asset_1nfahwx.jpg`** (ID: `media_nneufxk`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561461999_asset_wdoza82.jpg`** (ID: `media_nxnu2ec`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786569543822_asset_dzm6j4a.jpg`** (ID: `media_nzsodet`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562269679_asset_jk87rdg.jpg`** (ID: `media_ofiqhvk`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786558742296_asset_03mkdyh.jpg`** (ID: `media_olkwgpx`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786553781716_asset_d42w5g5.jpg`** (ID: `media_ow2pa77`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786566612946_asset_vymuyy4.jpg`** (ID: `media_ozzkoou`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786603322743_asset_x75qww0.jpg`** (ID: `media_pbl6gfu`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564799928_asset_6rleu7e.jpg`** (ID: `media_pua5g5t`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786603468206_asset_ncga1j3.jpg`** (ID: `media_q3kbk89`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563517859_asset_om18za0.jpg`** (ID: `media_qcn2eqf`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564351539_asset_9rpgjqa.jpg`** (ID: `media_qimvhnl`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562266455_asset_b2ubkre.jpg`** (ID: `media_qtrfayf`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1787843568831_asset_n52eor7.jpg`** (ID: `media_s3urdvw`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786562569127_asset_aoqjq16.jpg`** (ID: `media_si2nbk6`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786569597350_asset_04vilxd.jpg`** (ID: `media_soh87i1`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561857206_asset_eg371bv.jpg`** (ID: `media_st8pmac`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786603618993_asset_v02tahm.jpg`** (ID: `media_szkz7te`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786553853301_asset_nf1nxxs.jpg`** (ID: `media_tsdja73`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786568980286_asset_ztk2kk6.jpg`** (ID: `media_tszhr0b`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786566470409_asset_z4cprg1.jpg`** (ID: `media_ttpuqot`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786564344059_asset_sikzj6o.jpg`** (ID: `media_tv8903l`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786559946295_asset_dkhrd6l.jpg`** (ID: `media_twlnx3j`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563896402_asset_s6cmyoo.jpg`** (ID: `media_u4diuus`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564806972_asset_6ysm5ah.jpg`** (ID: `media_u9zttbn`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562586161_asset_c00yxvu.jpg`** (ID: `media_ufno0hm`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786565970352_asset_8pb9r42.jpg`** (ID: `media_ujmd41a`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563515580_asset_5g5dpxc.jpg`** (ID: `media_uq5tj1h`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786568777275_asset_hja4aee.jpg`** (ID: `media_uwytzfr`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786569238631_asset_4kp1zej.jpg`** (ID: `media_v6p1dta`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786553784307_asset_ueky32l.jpg`** (ID: `media_vsojuhh`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786558737677_asset_s5p9pqb.jpg`** (ID: `media_w2rou6o`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786569592355_asset_lmlasog.jpg`** (ID: `media_w2s51ec`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564133194_asset_l16wwkh.jpg`** (ID: `media_w45cxwd`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786565480438_asset_tixrfny.jpg`** (ID: `media_wb54prw`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563510809_asset_fztnsu4.jpg`** (ID: `media_wmi7kw5`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786553775975_asset_nwo30tx.jpg`** (ID: `media_wslgpzm`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786603464073_asset_save7v3.jpg`** (ID: `media_x10a7hb`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786563513682_asset_y4abxye.jpg`** (ID: `media_xj578sf`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786562271761_asset_zfmuzdh.jpg`** (ID: `media_ycmhuxe`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786564135892_asset_n4pcakk.jpg`** (ID: `media_yednpae`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`categories/1786480347819_asset_fbuvep5.jpg`** (ID: `media_z2y8and`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/gallery/1786561850969_asset_6y5vvll.jpg`** (ID: `media_z40f14r`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1787018861433_asset_jz5v918.mp4`** (ID: `media_z81dkkn`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.
- **`products/1786565797249_asset_6b2hvuo.jpg`** (ID: `media_zzi8war`): Asset inaccessible: Supabase egress quota exceeded (402) and file not present in local images folder.

## Migration Safety Notes
- **Supabase Preserved**: No media files were deleted or modified in Supabase Storage.
- **Zero Downtime**: Legacy Supabase URLs and new RustFS S3 URLs are dual-indexed in Firebase RTDB.
- **Dynamic Fallback**: `media-resolver.js` automatically resolves both URL schemes and provides multi-tiered error resilience.
