/**
 * OpenLibreLinkUp Watchface
 *
 * A Pebble watchface for displaying LibreLinkUp CGM data.
 * Displays: Time, CGM value, trend arrow, delta, age, and CGM chart.
 */

#include <pebble.h>

// AppMessage keys (must match appinfo.json)
#define KEY_CGM_VALUE     0
#define KEY_CGM_DELTA     1
#define KEY_CGM_TREND     2
#define KEY_CGM_TIME_AGO  3
#define KEY_CGM_HISTORY   4
#define KEY_CGM_ALERT     5
#define KEY_REQUEST_DATA  6
#define KEY_LOW_THRESHOLD 7
#define KEY_HIGH_THRESHOLD 8
#define KEY_NEEDS_SETUP   9
#define KEY_REVERSED      10
#define KEY_SYNC_ERROR    11
#define KEY_GOOD_COLOR    13
#define KEY_WARNING_COLOR 14
#define KEY_ALARM_COLOR   15
#define KEY_POLL_INTERVAL 16
#define KEY_QUICK_VIEW    17
#define KEY_LOW_ALARM_THRESHOLD 18
#define KEY_HIGH_ALARM_THRESHOLD 19

// Trend arrow indices
#define TREND_NONE        0
#define TREND_DOUBLE_UP   1
#define TREND_UP          2
#define TREND_UP_45       3
#define TREND_FLAT        4
#define TREND_DOWN_45     5
#define TREND_DOWN        6
#define TREND_DOUBLE_DOWN 7
#define TREND_HIDE        255  // Special value: hide trend icon entirely

// Alert types
#define ALERT_NONE        0
#define ALERT_LOW_SOON    1
#define ALERT_HIGH        2

// Chart configuration
#define CHART_MAX_POINTS  26  // 130 minutes / 5 minutes = 26 points
#define CHART_DOT_RADIUS  4
#define CHART_DISPLAY_HOURS 5  // four previous full hours plus the current hour
#define CHART_LEFT_GUTTER 32   // room for min/max in the same font as hour labels
#define CHART_EDGE_MARGIN 4

// Display layout constants for Pebble Time 2 (200x228)
#define SCREEN_WIDTH       200
#define TIME_ROW_Y         0
#define DIVIDER_Y          44
#define CGM_ROW_Y          52
#define CHART_Y            108
#define CHART_HEIGHT       95
#define BOTTOM_ROW_Y       196

// Window and layers
static Window *s_main_window;
static Layer *s_chart_layer;
static Layer *s_divider_layer;
static Layer *s_quick_view_layer;
static TextLayer *s_date_layer;
static Layer *s_sync_layer;
static Layer *s_alert_layer;
static TextLayer *s_time_layer;
static TextLayer *s_cgm_value_layer;
static TextLayer *s_delta_layer;
static Layer *s_delta_triangle_layer;
static TextLayer *s_time_ago_layer;
static TextLayer *s_hour_label_layers[CHART_DISPLAY_HOURS];
static Layer *s_trend_layer;
static TextLayer *s_setup_layer;
static TextLayer *s_no_data_layer;
static Layer *s_loading_layer;
static AppTimer *s_loading_timer;

// Text buffers
static char s_time_buffer[12];
static char s_date_buffer[32];
static char s_cgm_value_buffer[8];
static char s_delta_buffer[12];
static char s_time_ago_buffer[24];
static char s_hour_label_buffers[CHART_DISPLAY_HOURS][4];

// Chart data
static int16_t s_chart_values[CHART_MAX_POINTS];
static int s_chart_count = 0;

// Current trend
static uint8_t s_current_trend = TREND_NONE;

// Time ago tracking
static int s_last_minutes_ago = -1;  // -1 = no data received yet
static time_t s_last_data_time = 0;   // When we last received data from phone

// Threshold settings (defaults, updated from phone)
static int s_low_threshold = 80;
static int s_high_threshold = 180;
static int s_low_alarm_threshold = 70;
static int s_high_alarm_threshold = 250;
static int s_poll_interval_minutes = 5;

// Configurable chart point colors
#ifdef PBL_COLOR
static GColor s_good_color = GColorScreaminGreen;
static GColor s_warning_color = GColorChromeYellow;
static GColor s_alarm_color = GColorRed;
#endif

// Display mode (false = white on black, true = black on white)
static bool s_reversed = false;

// Optional colored background band for fast glucose-status recognition.
static bool s_quick_view_enabled = false;
static bool s_quick_view_active = false;

// Retry tracking for outbox failures
static bool s_is_retry = false;
static bool s_has_outbox_failure = false;  // True after retry also fails
static bool s_has_sync_error = false;      // True when the phone app reports an API error

// Sync spinner state (shown during data send/receive)
static bool s_is_syncing = false;
static int s_sync_frame = 0;
static AppTimer *s_sync_timer = NULL;
static AppTimer *s_sync_stop_timer = NULL;  // Timer to auto-stop spinner
#define SYNC_SPINNER_FRAMES 8
#define SYNC_SPINNER_INTERVAL 100  // ms per frame
#define SYNC_DISPLAY_MS 400  // Show sync spinner for a certain period of time on data send/receive

// Loading state
static bool s_is_loading = true;
static int s_loading_frame = 0;
static AppTimer *s_loading_timeout_timer;
#define LOADING_DOT_COUNT 3
#define LOADING_FRAMES_PER_DOT 6
#define LOADING_ANIMATION_INTERVAL 100  // ms per frame
#define LOADING_TIMEOUT_MS 15000  // 15 seconds

// Forward declarations
static void update_trend_icon(uint8_t trend);
static void update_current_glucose_color(void);
static void apply_cgm_row_colors(void);
static void update_quick_view_state(void);
static void quick_view_layer_update_proc(Layer *layer, GContext *ctx);
static void trend_layer_update_proc(Layer *layer, GContext *ctx);
static void update_layout_for_cgm_text(const char *cgm_text);
static void update_time_ago_display(void);
static void update_date(void);
static void update_chart_hour_labels(void);
static void format_chart_axis_value(int mgdl, char *buffer, size_t size);
static void delta_triangle_layer_update_proc(Layer *layer, GContext *ctx);
static void loading_timer_callback(void *data);
static void loading_timeout_callback(void *data);
static void show_data_layers(void);
static void hide_data_layers(void);
static void hide_loading_show_data(void);
static void sync_timer_callback(void *data);
static void sync_stop_timer_callback(void *data);
static void start_sync_spinner(void);
static void stop_sync_spinner(void);
static void update_alert_visibility(void);
static void trigger_low_soon_alarm(void);
static void trigger_high_alarm(void);

/**
 * Apply colors based on reversed mode to all UI elements
 */
static void apply_colors() {
    GColor bg_color = s_reversed ? GColorWhite : GColorBlack;
    GColor fg_color = s_reversed ? GColorBlack : GColorWhite;

    // Update window background
    window_set_background_color(s_main_window, bg_color);

    // Update text layer colors
    text_layer_set_text_color(s_time_layer, fg_color);
    text_layer_set_text_color(s_date_layer, fg_color);
    text_layer_set_text_color(s_setup_layer, fg_color);
    for (int i = 0; i < CHART_DISPLAY_HOURS; i++) {
        if (s_hour_label_layers[i]) {
            text_layer_set_text_color(s_hour_label_layers[i], fg_color);
        }
    }
    text_layer_set_text_color(s_no_data_layer, fg_color);

    // The glucose value and trend arrow use the current point color.
    update_current_glucose_color();
    update_trend_icon(s_current_trend);

    // Mark chart layer dirty to redraw with new colors
    if (s_chart_layer) {
        layer_mark_dirty(s_chart_layer);
    }

    // Mark loading layer dirty if visible
    if (s_loading_layer) {
        layer_mark_dirty(s_loading_layer);
    }

    // Mark sync layer dirty to redraw with new colors
    if (s_sync_layer) {
        layer_mark_dirty(s_sync_layer);
    }

    // Mark alert layer dirty to redraw with new colors
    if (s_alert_layer) {
        layer_mark_dirty(s_alert_layer);
    }
}

/**
 * Draw the loading animation (three jumping dots)
 * Animation has 6 frames per dot cycle for smoother motion
 */
static void loading_layer_update_proc(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    GColor fg_color = s_reversed ? GColorBlack : GColorWhite;

    graphics_context_set_fill_color(ctx, fg_color);

    // Dot configuration
    int dot_radius = 3;
    int dot_spacing = 14;
    int total_width = (LOADING_DOT_COUNT - 1) * dot_spacing;
    int start_x = (bounds.size.w - total_width) / 2;
    int base_y = bounds.size.h / 2;

    // Y offsets for smooth jump animation
    // Frame 0: starting up, 1: peak, 2: coming down, 3-5: at rest
    static const int jump_offsets[LOADING_FRAMES_PER_DOT] = { -4, -7, -3, 0, 0, 0 };

    for (int i = 0; i < LOADING_DOT_COUNT; i++) {
        int x = start_x + i * dot_spacing;

        // Calculate which frame this dot is in based on global frame
        // Each dot is offset by 2 frames to stagger the jumps evenly
        int dot_frame = (s_loading_frame - i * 2 + LOADING_FRAMES_PER_DOT * LOADING_DOT_COUNT) % LOADING_FRAMES_PER_DOT;
        int y_offset = jump_offsets[dot_frame];

        int y = base_y + y_offset;
        graphics_fill_circle(ctx, GPoint(x, y), dot_radius);
    }
}

/**
 * Draw the sync spinner (small rotating arc)
 */
static void sync_layer_update_proc(Layer *layer, GContext *ctx) {
    if (!s_is_syncing) {
        return;
    }

    GRect bounds = layer_get_bounds(layer);
    GColor fg_color = s_reversed ? GColorBlack : GColorWhite;

    int cx = bounds.size.w / 2;
    int cy = bounds.size.h / 2;

    graphics_context_set_stroke_color(ctx, fg_color);
    graphics_context_set_stroke_width(ctx, 2);

    // Draw spinning arc
    int radius = 4;

    // Draw arc segments based on current frame
    // Each frame rotates the arc by 45 degrees (360 / 8 frames)
    int start_angle = s_sync_frame * (360 / SYNC_SPINNER_FRAMES);

    // Draw a 270-degree arc (leaving a 90-degree gap for spinner effect)
    graphics_draw_arc(ctx,
        GRect(cx - radius, cy - radius, radius * 2, radius * 2),
        GOvalScaleModeFitCircle,
        DEG_TO_TRIGANGLE(start_angle),
        DEG_TO_TRIGANGLE(start_angle + 270));
}

/**
 * Trigger the low-soon alarm.
 * Pebble Time 2 uses its speaker; muted or speaker-less models fall back
 * to the existing vibration pattern.
 */
static void trigger_low_soon_alarm(void) {
#ifdef PBL_SPEAKER
    if (!speaker_is_muted()) {
        static const SpeakerNote notes[] = {
            {
                .midi_note = 79,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 170,
                .velocity = 120,
                .reserved = 0
            },
            {
                .midi_note = 0,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 90,
                .velocity = 0,
                .reserved = 0
            },
            {
                .midi_note = 76,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 170,
                .velocity = 120,
                .reserved = 0
            },
            {
                .midi_note = 0,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 70,
                .velocity = 0,
                .reserved = 0
            },
            {
                .midi_note = 72,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 260,
                .velocity = 127,
                .reserved = 0
            }
        };

        speaker_play_notes(notes, ARRAY_LENGTH(notes), 90);
        APP_LOG(APP_LOG_LEVEL_INFO, "Low soon acoustic alarm triggered");
        return;
    }
#endif

    static const uint32_t pattern[] = {
        70, 300, 70, 200, 70, 120, 70, 80, 70
    };
    vibes_enqueue_custom_pattern((VibePattern) {
        .durations = pattern,
        .num_segments = ARRAY_LENGTH(pattern)
    });
    APP_LOG(APP_LOG_LEVEL_INFO, "Low soon vibration fallback triggered");
}

/**
 * Trigger the high-glucose alarm.
 * Pebble Time 2 uses a distinct rising three-tone signal.
 */
static void trigger_high_alarm(void) {
#ifdef PBL_SPEAKER
    if (!speaker_is_muted()) {
        static const SpeakerNote notes[] = {
            {
                .midi_note = 72,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 180,
                .velocity = 120,
                .reserved = 0
            },
            {
                .midi_note = 0,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 90,
                .velocity = 0,
                .reserved = 0
            },
            {
                .midi_note = 76,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 180,
                .velocity = 120,
                .reserved = 0
            },
            {
                .midi_note = 0,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 90,
                .velocity = 0,
                .reserved = 0
            },
            {
                .midi_note = 79,
                .waveform = SpeakerWaveformSquare,
                .duration_ms = 300,
                .velocity = 127,
                .reserved = 0
            }
        };

        speaker_play_notes(notes, ARRAY_LENGTH(notes), 90);
        APP_LOG(APP_LOG_LEVEL_INFO, "High acoustic alarm triggered");
        return;
    }
#endif

    static const uint32_t pattern[] = {
        90, 120, 90, 200, 90, 300, 90
    };
    vibes_enqueue_custom_pattern((VibePattern) {
        .durations = pattern,
        .num_segments = ARRAY_LENGTH(pattern)
    });
    APP_LOG(APP_LOG_LEVEL_INFO, "High vibration fallback triggered");
}

/**
 * Draw the alert triangle icon (shown when data is stale AND connection failed)
 */
static void alert_layer_update_proc(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    GColor fg_color = s_reversed ? GColorBlack : GColorWhite;
    GColor bg_color = s_reversed ? GColorWhite : GColorBlack;

    int cx = bounds.size.w / 2;
    int cy = bounds.size.h / 2;

    // Triangle points (pointing up)
    GPoint top = GPoint(cx, cy - 6);
    GPoint bottom_left = GPoint(cx - 7, cy + 4);
    GPoint bottom_right = GPoint(cx + 7, cy + 4);

    // Fill triangle with foreground color
    graphics_context_set_fill_color(ctx, fg_color);
    GPathInfo triangle_path_info = {
        .num_points = 3,
        .points = (GPoint[]) { top, bottom_left, bottom_right }
    };
    GPath *triangle_path = gpath_create(&triangle_path_info);
    gpath_draw_filled(ctx, triangle_path);

    // Draw exclamation mark inside with background color (1px wide, centered)
    graphics_context_set_fill_color(ctx, bg_color);
    graphics_fill_rect(ctx, GRect(cx, cy - 2, 2, 4), 0, GCornerNone);
    graphics_fill_rect(ctx, GRect(cx, cy + 3, 2, 1), 0, GCornerNone);
}

/**
 * Update alert icon visibility based on data staleness and connection status
 * Alert shown when: data 10+ min old AND outbox failure (including failed retry)
 * Alert hidden when: sync spinner is showing
 */
static void update_alert_visibility(void) {
    if (!s_alert_layer) {
        return;
    }

    // Don't update alert while syncing - it will be updated when sync stops
    if (s_is_syncing) {
        return;
    }

    // Calculate current data age
    int current_minutes_ago = 0;
    if (s_last_minutes_ago >= 0 && s_last_data_time > 0) {
        time_t now = time(NULL);
        int elapsed_minutes = (int)((now - s_last_data_time) / 60);
        current_minutes_ago = s_last_minutes_ago + elapsed_minutes;
    }

    // Show alert if data is 15+ minutes old AND we have a sync failure
    // (either outbox failure OR iOS app reported API error)
    bool show_alert = (current_minutes_ago >= 15) && (s_has_outbox_failure || s_has_sync_error);
    layer_set_hidden(s_alert_layer, !show_alert);
}

/**
 * Sync spinner timer callback
 */
static void sync_timer_callback(void *data) {
    if (!s_is_syncing) {
        s_sync_timer = NULL;
        return;
    }

    // Advance to next frame
    s_sync_frame = (s_sync_frame + 1) % SYNC_SPINNER_FRAMES;

    // Redraw the sync layer
    if (s_sync_layer) {
        layer_mark_dirty(s_sync_layer);
    }

    // Schedule next frame
    s_sync_timer = app_timer_register(SYNC_SPINNER_INTERVAL, sync_timer_callback, NULL);
}

/**
 * Timer callback to auto-stop sync spinner
 */
static void sync_stop_timer_callback(void *data) {
    s_sync_stop_timer = NULL;
    stop_sync_spinner();
}

/**
 * Start the sync spinner animation (auto-stops after SYNC_DISPLAY_MS)
 */
static void start_sync_spinner(void) {
    // Cancel any pending stop timer and restart the display period
    if (s_sync_stop_timer) {
        app_timer_cancel(s_sync_stop_timer);
    }
    s_sync_stop_timer = app_timer_register(SYNC_DISPLAY_MS, sync_stop_timer_callback, NULL);

    // Hide alert while syncing
    if (s_alert_layer) {
        layer_set_hidden(s_alert_layer, true);
    }

    if (s_is_syncing) {
        return;  // Animation already running, just reset the stop timer
    }

    s_is_syncing = true;
    s_sync_frame = 0;

    if (s_sync_layer) {
        layer_mark_dirty(s_sync_layer);
    }

    // Start animation timer
    s_sync_timer = app_timer_register(SYNC_SPINNER_INTERVAL, sync_timer_callback, NULL);
}

/**
 * Stop the sync spinner animation
 */
static void stop_sync_spinner(void) {
    if (!s_is_syncing) {
        return;  // Not running
    }

    s_is_syncing = false;

    if (s_sync_timer) {
        app_timer_cancel(s_sync_timer);
        s_sync_timer = NULL;
    }

    if (s_sync_stop_timer) {
        app_timer_cancel(s_sync_stop_timer);
        s_sync_stop_timer = NULL;
    }

    if (s_sync_layer) {
        layer_mark_dirty(s_sync_layer);
    }

    // Re-evaluate alert visibility now that sync is done
    update_alert_visibility();
}

/**
 * Loading animation timer callback
 */
static void loading_timer_callback(void *data) {
    if (!s_is_loading) {
        s_loading_timer = NULL;
        return;
    }

    // Advance to next frame
    s_loading_frame = (s_loading_frame + 1) % LOADING_FRAMES_PER_DOT;

    // Redraw the loading layer
    if (s_loading_layer) {
        layer_mark_dirty(s_loading_layer);
    }

    // Schedule next frame
    s_loading_timer = app_timer_register(LOADING_ANIMATION_INTERVAL, loading_timer_callback, NULL);
}

/**
 * Loading timeout callback - stop animation and show error message
 */
static void loading_timeout_callback(void *data) {
    s_loading_timeout_timer = NULL;

    if (!s_is_loading) {
        return;
    }

    s_is_loading = false;

    // Cancel animation timer
    if (s_loading_timer) {
        app_timer_cancel(s_loading_timer);
        s_loading_timer = NULL;
    }

    // Hide loading layer, show error in setup layer
    layer_set_hidden(s_loading_layer, true);
    text_layer_set_text(s_setup_layer, "Unable to connect");
    layer_set_hidden(text_layer_get_layer(s_setup_layer), false);
}

/**
 * Show all CGM data layers (except CGM value/trend/delta which are controlled by staleness check)
 */
static void show_data_layers(void) {
    // Note: CGM value, trend arrow, and delta visibility are controlled by
    // update_time_ago_display() based on data staleness, not shown unconditionally here.
    // This prevents a flash of stale data before the staleness check runs.
    layer_set_hidden(text_layer_get_layer(s_time_ago_layer), true);
    layer_set_hidden(s_chart_layer, false);
    for (int i = 0; i < CHART_DISPLAY_HOURS; i++) {
        if (s_hour_label_layers[i]) {
            layer_set_hidden(text_layer_get_layer(s_hour_label_layers[i]), false);
        }
    }
    update_quick_view_state();
}

/**
 * Hide all CGM data layers
 */
static void hide_data_layers(void) {
    s_quick_view_active = false;
    if (s_quick_view_layer) {
        layer_set_hidden(s_quick_view_layer, true);
    }

    layer_set_hidden(text_layer_get_layer(s_cgm_value_layer), true);
    layer_set_hidden(s_trend_layer, true);
    layer_set_hidden(text_layer_get_layer(s_delta_layer), true);
    layer_set_hidden(s_delta_triangle_layer, true);
    layer_set_hidden(text_layer_get_layer(s_time_ago_layer), true);
    layer_set_hidden(s_chart_layer, true);
    for (int i = 0; i < CHART_DISPLAY_HOURS; i++) {
        if (s_hour_label_layers[i]) {
            layer_set_hidden(text_layer_get_layer(s_hour_label_layers[i]), true);
        }
    }
    layer_set_hidden(text_layer_get_layer(s_no_data_layer), true);
    apply_cgm_row_colors();
}

/**
 * Hide loading state and show CGM data
 */
static void hide_loading_show_data(void) {
    if (!s_is_loading) {
        return;
    }

    s_is_loading = false;

    // Cancel loading timers
    if (s_loading_timer) {
        app_timer_cancel(s_loading_timer);
        s_loading_timer = NULL;
    }
    if (s_loading_timeout_timer) {
        app_timer_cancel(s_loading_timeout_timer);
        s_loading_timeout_timer = NULL;
    }

    // Hide loading layer, show data layers
    layer_set_hidden(s_loading_layer, true);
    show_data_layers();
    // Update CGM value/trend/delta visibility based on staleness
    // (will be called again when KEY_CGM_TIME_AGO is processed, but that's fine)
    update_time_ago_display();
}

/**
 * Convert the displayed glucose string back to internal mg/dL.
 * Integer text is treated as mg/dL; decimal text is treated as mmol/L.
 */
static int parse_display_glucose_to_mgdl(const char *text) {
    if (!text || !text[0] ||
        strcmp(text, "LOW") == 0 ||
        strcmp(text, "HIGH") == 0) {
        return 0;
    }

    const char *dot = strchr(text, '.');
    if (!dot) {
        return atoi(text);
    }

    int whole = 0;
    const char *ptr = text;
    while (*ptr >= '0' && *ptr <= '9') {
        whole = whole * 10 + (*ptr - '0');
        ptr++;
    }

    int tenth = 0;
    if (*ptr == '.' && ptr[1] >= '0' && ptr[1] <= '9') {
        tenth = ptr[1] - '0';
    }

    int mmol_tenths = whole * 10 + tenth;
    return (mmol_tenths * 180182 + 50000) / 100000;
}

/**
 * Parse compact chart history.
 * Current format: "120,125,130,..." (most recent first).
 * The older "120:0,125:5,..." format remains accepted for compatibility.
 */
static void parse_chart_history(const char *history) {
    if (history == NULL || history[0] == '\0') {
        return;
    }

    int16_t parsed_values[CHART_MAX_POINTS];
    int parsed_count = 0;
    const char *ptr = history;

    while (*ptr && parsed_count < CHART_MAX_POINTS) {
        int value = 0;
        bool has_digits = false;

        while (*ptr >= '0' && *ptr <= '9') {
            has_digits = true;
            value = value * 10 + (*ptr - '0');
            ptr++;
        }

        // Accept the older "value:minutesAgo" format too.
        if (*ptr == ':') {
            ptr++;
            while (*ptr >= '0' && *ptr <= '9') {
                ptr++;
            }
        }

        if (has_digits && value > 0) {
            parsed_values[parsed_count] = (int16_t)value;
            parsed_count++;
        }

        if (*ptr == ',') {
            ptr++;
        } else if (*ptr != '\0') {
            // Skip an unexpected character instead of discarding everything.
            ptr++;
        }
    }

    // Only replace the visible chart when at least one valid value was parsed.
    if (parsed_count > 0) {
        for (int i = 0; i < parsed_count; i++) {
            s_chart_values[i] = parsed_values[i];
        }
        s_chart_count = parsed_count;
    }
}

/**
 * Get the color for a glucose value.
 *
 * Warning thresholds define the green/yellow transition.
 * Alarm thresholds define the yellow/red transition and are the same
 * thresholds used by the configured glucose alarms.
 */
#ifdef PBL_COLOR
static GColor get_glucose_color(int value) {
    if (
        value <= s_low_alarm_threshold ||
        value >= s_high_alarm_threshold
    ) {
        return s_alarm_color;
    }

    if (
        value < s_low_threshold ||
        value > s_high_threshold
    ) {
        return s_warning_color;
    }

    return s_good_color;
}
#endif

/**
 * Return the same category color used by the newest chart point.
 */
static GColor get_current_glucose_color(void) {
#ifdef PBL_COLOR
    int current_mgdl =
        parse_display_glucose_to_mgdl(s_cgm_value_buffer);

    if (current_mgdl > 0) {
        return get_glucose_color(current_mgdl);
    }
#endif

    return s_reversed ? GColorBlack : GColorWhite;
}

/**
 * Draw the optional Quick View background band.
 */
static void quick_view_layer_update_proc(Layer *layer, GContext *ctx) {
    if (!s_quick_view_active) {
        return;
    }

    graphics_context_set_fill_color(ctx, get_current_glucose_color());
    graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
}

/**
 * Apply the correct foreground colors to every item in the CGM row.
 * Quick View always uses black text and symbols.
 */
static void apply_cgm_row_colors(void) {
    GColor normal_fg = s_reversed ? GColorBlack : GColorWhite;
    GColor value_color = s_quick_view_active
        ? GColorBlack
        : get_current_glucose_color();
    GColor info_color = s_quick_view_active
        ? GColorBlack
        : normal_fg;

    if (s_cgm_value_layer) {
        text_layer_set_text_color(s_cgm_value_layer, value_color);
    }
    if (s_delta_layer) {
        text_layer_set_text_color(s_delta_layer, info_color);
    }
    if (s_time_ago_layer) {
        text_layer_set_text_color(s_time_ago_layer, info_color);
    }
    if (s_trend_layer) {
        layer_mark_dirty(s_trend_layer);
    }
    if (s_delta_triangle_layer) {
        layer_mark_dirty(s_delta_triangle_layer);
    }
    if (s_quick_view_layer) {
        layer_mark_dirty(s_quick_view_layer);
    }
}

/**
 * Apply the point color to the large glucose value and trend arrow.
 */
static void update_current_glucose_color(void) {
    apply_cgm_row_colors();
}

/**
 * Show Quick View only while a valid, non-stale glucose value is visible.
 */
static void update_quick_view_state(void) {
    bool active = false;

    if (
        s_quick_view_enabled &&
        !s_is_loading &&
        s_last_minutes_ago >= 0 &&
        s_last_data_time > 0 &&
        parse_display_glucose_to_mgdl(s_cgm_value_buffer) > 0
    ) {
        time_t now = time(NULL);
        int elapsed_minutes = (int)((now - s_last_data_time) / 60);
        int current_minutes_ago = s_last_minutes_ago + elapsed_minutes;
        active = current_minutes_ago < 60;
    }

    s_quick_view_active = active;

    if (s_quick_view_layer) {
        layer_set_hidden(s_quick_view_layer, !active);
    }

    apply_cgm_row_colors();
}

/**
 * Draw a slightly thicker line using three one-pixel lines.
 */
static void draw_trend_line(
    GContext *ctx,
    GPoint from,
    GPoint to
) {
    graphics_draw_line(ctx, from, to);
    graphics_draw_line(
        ctx,
        GPoint(from.x + 1, from.y),
        GPoint(to.x + 1, to.y)
    );
    graphics_draw_line(
        ctx,
        GPoint(from.x, from.y + 1),
        GPoint(to.x, to.y + 1)
    );
}

/**
 * Draw the trend arrow in the same color as the current chart point.
 */
static void trend_layer_update_proc(Layer *layer, GContext *ctx) {
    (void)layer;

    graphics_context_set_stroke_color(
        ctx,
        s_quick_view_active ? GColorBlack : get_current_glucose_color()
    );

    switch (s_current_trend) {
        case TREND_DOUBLE_UP:
            draw_trend_line(ctx, GPoint(10, 25), GPoint(10, 7));
            draw_trend_line(ctx, GPoint(10, 7), GPoint(6, 12));
            draw_trend_line(ctx, GPoint(10, 7), GPoint(14, 12));
            draw_trend_line(ctx, GPoint(20, 25), GPoint(20, 7));
            draw_trend_line(ctx, GPoint(20, 7), GPoint(16, 12));
            draw_trend_line(ctx, GPoint(20, 7), GPoint(24, 12));
            break;

        case TREND_UP:
            draw_trend_line(ctx, GPoint(15, 25), GPoint(15, 5));
            draw_trend_line(ctx, GPoint(15, 5), GPoint(9, 12));
            draw_trend_line(ctx, GPoint(15, 5), GPoint(21, 12));
            break;

        case TREND_UP_45:
            draw_trend_line(ctx, GPoint(6, 24), GPoint(24, 6));
            draw_trend_line(ctx, GPoint(24, 6), GPoint(15, 6));
            draw_trend_line(ctx, GPoint(24, 6), GPoint(24, 15));
            break;

        case TREND_FLAT:
            draw_trend_line(ctx, GPoint(5, 15), GPoint(25, 15));
            draw_trend_line(ctx, GPoint(25, 15), GPoint(18, 9));
            draw_trend_line(ctx, GPoint(25, 15), GPoint(18, 21));
            break;

        case TREND_DOWN_45:
            draw_trend_line(ctx, GPoint(6, 6), GPoint(24, 24));
            draw_trend_line(ctx, GPoint(24, 24), GPoint(15, 24));
            draw_trend_line(ctx, GPoint(24, 24), GPoint(24, 15));
            break;

        case TREND_DOWN:
            draw_trend_line(ctx, GPoint(15, 5), GPoint(15, 25));
            draw_trend_line(ctx, GPoint(15, 25), GPoint(9, 18));
            draw_trend_line(ctx, GPoint(15, 25), GPoint(21, 18));
            break;

        case TREND_DOUBLE_DOWN:
            draw_trend_line(ctx, GPoint(10, 5), GPoint(10, 23));
            draw_trend_line(ctx, GPoint(10, 23), GPoint(6, 18));
            draw_trend_line(ctx, GPoint(10, 23), GPoint(14, 18));
            draw_trend_line(ctx, GPoint(20, 5), GPoint(20, 23));
            draw_trend_line(ctx, GPoint(20, 23), GPoint(16, 18));
            draw_trend_line(ctx, GPoint(20, 23), GPoint(24, 18));
            break;

        case TREND_NONE:
        default:
            break;
    }
}

/**
 * Draw the horizontal divider line with 50% dot pattern
 */
static void divider_layer_update_proc(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    graphics_context_set_stroke_color(ctx, GColorLightGray);
    for (int x = 0; x < bounds.size.w; x += 2) {
        graphics_draw_pixel(ctx, GPoint(x, 0));
    }
}

/**
 * Draw the CGM dot chart
 */
static void chart_layer_update_proc(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    GColor bg_color = s_reversed ? GColorWhite : GColorBlack;

    graphics_context_set_fill_color(ctx, bg_color);
    graphics_fill_rect(ctx, bounds, 0, GCornerNone);

    int margin = CHART_EDGE_MARGIN;
    int chart_height = bounds.size.h - (margin * 2);
    int chart_left = bounds.origin.x + margin;
    int chart_right = bounds.origin.x + bounds.size.w - margin;
    int label_x = bounds.origin.x + 1;

    // Use history when present. Otherwise derive one point directly from the
    // glucose value that is already visible on the watchface.
    int local_count = s_chart_count;
    int16_t current_fallback = 0;
    const int16_t *values = s_chart_values;

    if (local_count <= 0) {
        int current_mgdl =
            parse_display_glucose_to_mgdl(s_cgm_value_buffer);

        if (current_mgdl > 0) {
            current_fallback = (int16_t)current_mgdl;
            values = &current_fallback;
            local_count = 1;
        }
    }

    // Draw the vertical time grid even when there is no data yet.
#ifdef PBL_COLOR
    GColor grid_color = GColorDarkGray;
    GColor axis_text_color = s_reversed ? GColorBlack : GColorWhite;
    graphics_context_set_stroke_color(ctx, grid_color);
    graphics_context_set_text_color(ctx, axis_text_color);
#else
    GColor line_color = s_reversed ? GColorBlack : GColorWhite;
    graphics_context_set_stroke_color(ctx, line_color);
    graphics_context_set_text_color(ctx, line_color);
#endif

    time_t now = time(NULL);
    struct tm *tick_time = localtime(&now);
    int current_minute = tick_time->tm_min;
    int chart_width = chart_right - chart_left;
    const int chart_window_minutes = 210;

    // Show the four previous full hours from the left edge through the
    // current time at the right edge. At 20:02 this is 16:00 to 20:02.
    for (int i = 0; i < CHART_DISPLAY_HOURS; i++) {
        int minutes_ago = current_minute + (i * 60);

        int x = chart_right -
                (minutes_ago * chart_width) /
                chart_window_minutes;

        // Keep the time scale fixed at four hours. Old grid lines slide out
        // on the left instead of stretching the whole chart.
        if (
            x < bounds.origin.x ||
            x >= bounds.origin.x + bounds.size.w
        ) {
            continue;
        }

        graphics_draw_line(
            ctx,
            GPoint(x, bounds.origin.y + margin),
            GPoint(x, bounds.origin.y + margin + chart_height)
        );
    }

    if (local_count <= 0) {
        return;
    }

    int raw_min = values[0];
    int raw_max = values[0];

    for (int i = 1; i < local_count; i++) {
        if (values[i] < raw_min) raw_min = values[i];
        if (values[i] > raw_max) raw_max = values[i];
    }

    // Dynamic scaling: use the full available height.
    // Add a little padding and enforce a minimum span so tiny differences
    // do not look huge.
    const int padding = 10;      // about 0.6 mmol/L
    const int min_span = 36;     // 2.0 mmol/L

    int plot_min = raw_min - padding;
    int plot_max = raw_max + padding;

    if (plot_max - plot_min < min_span) {
        int mid = (plot_min + plot_max) / 2;
        plot_min = mid - (min_span / 2);
        plot_max = mid + (min_span / 2);
    }

    if (plot_min < 1) {
        plot_min = 1;
    }
    if (plot_max <= plot_min) {
        plot_max = plot_min + min_span;
    }

    // Find the exact screen position of the min/max measurement points.
    // Their text labels will be vertically centered on these coordinates,
    // allowing perfectly horizontal leader lines that hit the point centers.
    bool have_min_point = false;
    bool have_max_point = false;
    int min_point_x = chart_left;
    int min_point_y = bounds.origin.y + margin + chart_height;
    int max_point_x = chart_left;
    int max_point_y = bounds.origin.y + margin;

    for (int i = 0; i < local_count; i++) {
        int original_value = values[i];
        int clamped_value = original_value;

        if (clamped_value < plot_min) clamped_value = plot_min;
        if (clamped_value > plot_max) clamped_value = plot_max;

        int x;
        if (local_count == 1) {
            x = chart_right - CHART_DOT_RADIUS;
        } else {
            int display_index = local_count - 1 - i;
            x = chart_left +
                (display_index * (chart_right - chart_left)) /
                (local_count - 1);
        }

        int y = bounds.origin.y + margin + chart_height -
                ((clamped_value - plot_min) * chart_height /
                 (plot_max - plot_min));

        if (!have_min_point && original_value == raw_min) {
            min_point_x = x;
            min_point_y = y;
            have_min_point = true;
        }

        if (!have_max_point && original_value == raw_max) {
            max_point_x = x;
            max_point_y = y;
            have_max_point = true;
        }
    }

    // Draw the small min/max labels on the left.
    char min_buffer[8];
    char max_buffer[8];
    format_chart_axis_value(raw_min, min_buffer, sizeof(min_buffer));
    format_chart_axis_value(raw_max, max_buffer, sizeof(max_buffer));

    const int axis_label_height = 24;

    GRect max_label_rect =
        GRect(
            label_x,
            max_point_y - (axis_label_height / 2),
            CHART_LEFT_GUTTER - 2,
            axis_label_height
        );
    GRect min_label_rect =
        GRect(
            label_x,
            min_point_y - (axis_label_height / 2),
            CHART_LEFT_GUTTER - 2,
            axis_label_height
        );

    // Keep both labels when their displayed values differ by at least
    // 0.2 mmol/L (or roughly 4 mg/dL). With a smaller gap, only show max.
    bool show_min_label = false;

    if (strchr(s_cgm_value_buffer, '.') != NULL) {
        unsigned int min_mmol_tenths =
            ((unsigned int)raw_min * 100000U + 90091U) / 180182U;
        unsigned int max_mmol_tenths =
            ((unsigned int)raw_max * 100000U + 90091U) / 180182U;

        show_min_label =
            max_mmol_tenths - min_mmol_tenths >= 2U;
    } else {
        show_min_label = raw_max - raw_min >= 4;
    }

    // Clear only the area actually occupied by the text, plus one pixel.
    // This keeps the grid interruption small instead of blanking the complete
    // 24-pixel label rectangle.
    GSize max_clear_size = graphics_text_layout_get_content_size(
        max_buffer,
        fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        max_label_rect,
        GTextOverflowModeTrailingEllipsis,
        GTextAlignmentLeft
    );
    GSize min_clear_size = graphics_text_layout_get_content_size(
        min_buffer,
        fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        min_label_rect,
        GTextOverflowModeTrailingEllipsis,
        GTextAlignmentLeft
    );

    // The font layout contains a few empty pixels above the visible glyphs.
    // Move the cleared area down while keeping its lower edge unchanged, so
    // the grid has roughly one pixel of space above and below the numbers.
    const int clear_top_inset = 6;

    GRect max_clear_rect = GRect(
        max_label_rect.origin.x,
        max_label_rect.origin.y + clear_top_inset,
        max_clear_size.w + 1,
        max_clear_size.h + 1 - clear_top_inset
    );
    GRect min_clear_rect = GRect(
        min_label_rect.origin.x,
        min_label_rect.origin.y + clear_top_inset,
        min_clear_size.w + 1,
        min_clear_size.h + 1 - clear_top_inset
    );

    graphics_context_set_fill_color(ctx, bg_color);
    graphics_fill_rect(ctx, max_clear_rect, 0, GCornerNone);
    if (show_min_label) {
        graphics_fill_rect(ctx, min_clear_rect, 0, GCornerNone);
    }

    graphics_draw_text(
        ctx,
        max_buffer,
        fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        max_label_rect,
        GTextOverflowModeTrailingEllipsis,
        GTextAlignmentLeft,
        NULL
    );

    if (show_min_label) {
        graphics_draw_text(
            ctx,
            min_buffer,
            fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
            min_label_rect,
            GTextOverflowModeTrailingEllipsis,
            GTextAlignmentLeft,
            NULL
        );
    }

    // Draw low/high threshold lines only when they fall within the visible
    // dynamic chart range.
    int dash_length = 6;
    int gap_length = 4;

#ifdef PBL_COLOR
    graphics_context_set_stroke_color(ctx, GColorLightGray);
#else
    graphics_context_set_stroke_color(ctx, line_color);
#endif

    if (s_low_threshold >= plot_min && s_low_threshold <= plot_max) {
        int low_y = bounds.origin.y + margin + chart_height -
                    ((s_low_threshold - plot_min) * chart_height /
                     (plot_max - plot_min));

        for (int x = chart_left; x < chart_right;
             x += dash_length + gap_length) {
            int end_x = x + dash_length - 1;
            if (end_x > chart_right) end_x = chart_right;
            graphics_draw_line(ctx, GPoint(x, low_y), GPoint(end_x, low_y));
        }
    }

    if (s_high_threshold >= plot_min && s_high_threshold <= plot_max) {
        int high_y = bounds.origin.y + margin + chart_height -
                     ((s_high_threshold - plot_min) * chart_height /
                      (plot_max - plot_min));

        for (int x = chart_left; x < chart_right;
             x += dash_length + gap_length) {
            int end_x = x + dash_length - 1;
            if (end_x > chart_right) end_x = chart_right;
            graphics_draw_line(ctx, GPoint(x, high_y), GPoint(end_x, high_y));
        }
    }

// Use exactly the same stroke color and one-pixel thickness as the
    // horizontal low/high threshold lines.
#ifdef PBL_COLOR
    graphics_context_set_stroke_color(ctx, GColorLightGray);
#else
    graphics_context_set_stroke_color(ctx, line_color);
#endif

    GSize max_label_size = graphics_text_layout_get_content_size(
        max_buffer,
        fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        max_label_rect,
        GTextOverflowModeTrailingEllipsis,
        GTextAlignmentLeft
    );
    GSize min_label_size = graphics_text_layout_get_content_size(
        min_buffer,
        fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        min_label_rect,
        GTextOverflowModeTrailingEllipsis,
        GTextAlignmentLeft
    );

    int max_label_line_x = max_label_rect.origin.x + max_label_size.w + 1;
    int min_label_line_x = min_label_rect.origin.x + min_label_size.w + 1;

    // Protect only the actually occupied text area. Chart points may still
    // reach the left display edge wherever they do not overlap the labels.
    GRect max_text_rect = GRect(
        max_label_rect.origin.x,
        max_label_rect.origin.y,
        max_label_size.w,
        max_label_rect.size.h
    );
    GRect min_text_rect = GRect(
        min_label_rect.origin.x,
        min_label_rect.origin.y,
        min_label_size.w,
        min_label_rect.size.h
    );

    if (have_max_point) {
        int end_x = max_point_x - CHART_DOT_RADIUS;
        if (end_x > max_label_line_x) {
            for (int x = max_label_line_x; x < end_x; x += 4) {
                int dot_end_x = x + 1;
                if (dot_end_x > end_x) dot_end_x = end_x;
                graphics_draw_line(
                    ctx,
                    GPoint(x, max_point_y),
                    GPoint(dot_end_x, max_point_y)
                );
            }
        }
    }

    if (have_min_point && show_min_label) {
        int end_x = min_point_x - CHART_DOT_RADIUS;
        if (end_x > min_label_line_x) {
            for (int x = min_label_line_x; x < end_x; x += 4) {
                int dot_end_x = x + 1;
                if (dot_end_x > end_x) dot_end_x = end_x;
                graphics_draw_line(
                    ctx,
                    GPoint(x, min_point_y),
                    GPoint(dot_end_x, min_point_y)
                );
            }
        }
    }

    for (int i = 0; i < local_count; i++) {
        int original_value = values[i];
        int clamped_value = original_value;

        if (clamped_value < plot_min) clamped_value = plot_min;
        if (clamped_value > plot_max) clamped_value = plot_max;

        int x;
        if (local_count == 1) {
            x = chart_right - CHART_DOT_RADIUS;
        } else {
            int display_index = local_count - 1 - i;
            x = chart_left +
                (display_index * (chart_right - chart_left)) /
                (local_count - 1);
        }

        int y = bounds.origin.y + margin + chart_height -
                ((clamped_value - plot_min) * chart_height /
                 (plot_max - plot_min));

        const int dot_radius = CHART_DOT_RADIUS - 1;
        GRect dot_rect = GRect(
            x - dot_radius,
            y - dot_radius,
            (dot_radius * 2) + 1,
            (dot_radius * 2) + 1
        );

        bool overlaps_max_label =
            dot_rect.origin.x < max_text_rect.origin.x + max_text_rect.size.w &&
            dot_rect.origin.x + dot_rect.size.w > max_text_rect.origin.x &&
            dot_rect.origin.y < max_text_rect.origin.y + max_text_rect.size.h &&
            dot_rect.origin.y + dot_rect.size.h > max_text_rect.origin.y;

        bool overlaps_min_label =
            show_min_label &&
            dot_rect.origin.x < min_text_rect.origin.x + min_text_rect.size.w &&
            dot_rect.origin.x + dot_rect.size.w > min_text_rect.origin.x &&
            dot_rect.origin.y < min_text_rect.origin.y + min_text_rect.size.h &&
            dot_rect.origin.y + dot_rect.size.h > min_text_rect.origin.y;

        if (overlaps_max_label || overlaps_min_label) {
            continue;
        }

#ifdef PBL_COLOR
        graphics_context_set_fill_color(
            ctx,
            get_glucose_color(original_value)
        );
#else
        GColor dot_color = s_reversed ? GColorBlack : GColorWhite;
        graphics_context_set_fill_color(ctx, dot_color);
#endif

        graphics_fill_circle(
            ctx,
            GPoint(x, y),
            CHART_DOT_RADIUS - 1
        );
    }
}

/**
 * Update the trend arrow icon
 */
static void update_trend_icon(uint8_t trend) {
    if (trend == TREND_HIDE) {
        layer_set_hidden(s_trend_layer, true);
        return;
    }

    if (trend > TREND_DOUBLE_DOWN) {
        trend = TREND_NONE;
    }

    s_current_trend = trend;
    layer_set_hidden(s_trend_layer, false);
    layer_mark_dirty(s_trend_layer);
}

/**
 * Format a small chart axis value using the same style as the visible CGM value.
 * If the main value shows a decimal point, we assume mmol/L. Otherwise mg/dL.
 */
static void format_chart_axis_value(int mgdl, char *buffer, size_t size) {
    if (!buffer || size == 0) {
        return;
    }

    // CGM chart values are non-negative and far below 999 mg/dL.
    // Explicitly clamp them so the compiler can verify the small text buffer.
    unsigned int safe_mgdl;
    if (mgdl < 0) {
        safe_mgdl = 0;
    } else if (mgdl > 999) {
        safe_mgdl = 999;
    } else {
        safe_mgdl = (unsigned int)mgdl;
    }

    if (strchr(s_cgm_value_buffer, '.') != NULL) {
        unsigned int mmol_tenths =
            (safe_mgdl * 100000U + 90091U) / 180182U;
        snprintf(
            buffer,
            size,
            "%u.%u",
            mmol_tenths / 10U,
            mmol_tenths % 10U
        );
    } else {
        snprintf(buffer, size, "%u", safe_mgdl);
    }
}

/**
 * Update layout positions based on CGM text width
 * Dynamically positions trend arrow and delta based on actual rendered text width
 * Hides delta for LOW/HIGH values since there's no room
 */
static void update_layout_for_cgm_text(const char *cgm_text) {

    // Show CGM value and trend layers (hidden on startup until data arrives)
    layer_set_hidden(text_layer_get_layer(s_cgm_value_layer), false);
    layer_set_hidden(s_trend_layer, false);

    // Check if this is a LOW or HIGH value - hide delta/update block in these cases
    bool hide_delta = (strcmp(cgm_text, "LOW") == 0 || strcmp(cgm_text, "HIGH") == 0);
    layer_set_hidden(text_layer_get_layer(s_delta_layer), hide_delta);
    layer_set_hidden(s_delta_triangle_layer, hide_delta);
    layer_set_hidden(text_layer_get_layer(s_time_ago_layer), hide_delta);

    // Get the actual rendered width of the CGM text
    GSize cgm_size = graphics_text_layout_get_content_size(
        cgm_text,
        fonts_get_system_font(FONT_KEY_BITHAM_42_BOLD),
        GRect(0, 0, 140, 52),
        GTextOverflowModeTrailingEllipsis,
        GTextAlignmentLeft
    );

    // Fixed-width block for "last update" + triangle + delta
    int delta_block_width = hide_delta ? 0 : 64;

    // Calculate total width: CGM + gap + trend(30) + gap + delta block
    int gap = 7;
    int trend_width = 30;
    int total_width = cgm_size.w + gap + trend_width;
    if (!hide_delta) {
        total_width += gap + delta_block_width;
    }

    // Center the entire row and bias it a little farther left so the
    // visible left and right margins feel more equal.
    int start_x = (SCREEN_WIDTH - total_width) / 2 - 8;

    // Lift the main glucose value slightly so it visually matches the stacked
    // height of "last update" + delta on the right.
    // Nudge the glucose value 5 px to the right for fine alignment.
    layer_set_frame(text_layer_get_layer(s_cgm_value_layer),
                    GRect(start_x + 10, CGM_ROW_Y - 3, 140, 52));

    // Position trend arrow after CGM text
    int trend_x = start_x + cgm_size.w + gap;
    layer_set_frame(s_trend_layer,
                    GRect(trend_x, CGM_ROW_Y + 9, 30, 30));

    // Position the stacked update/delta block after trend
    if (!hide_delta) {
        int delta_x = trend_x + trend_width + gap;

        // Keep the right-side mini block visually closer to the right edge,
        // while leaving the whole package slightly more left overall.
        layer_set_frame(text_layer_get_layer(s_time_ago_layer),
                        GRect(delta_x + 10, CGM_ROW_Y + 2, delta_block_width - 10, 22));

        layer_set_frame(s_delta_triangle_layer,
                        GRect(delta_x + 12, CGM_ROW_Y + 27, 12, 10));

        layer_set_frame(text_layer_get_layer(s_delta_layer),
                        GRect(delta_x + 24, CGM_ROW_Y + 21, delta_block_width - 24, 22));
    }
}

/**
 * Update the hour labels shown below the vertical grid lines.
 * For the 4h view, the three inner grid lines are labeled with the
 * previous full hours, for example 6, 7, 8 when the current hour is 9.
 */
static void update_chart_hour_labels(void) {
    time_t now = time(NULL);
    struct tm *tick_time = localtime(&now);

    int current_hour = tick_time->tm_hour;
    int current_minute = tick_time->tm_min;
    int chart_left = CHART_EDGE_MARGIN;
    int chart_right = SCREEN_WIDTH - CHART_EDGE_MARGIN;
    int chart_width = chart_right - chart_left;
    int label_width = 30;
    const int chart_window_minutes = 210;

    // The oldest full hour sits at the left edge and the current time at
    // the right edge. The five labels therefore remain visible together.
    int newest_hour_offset_minutes = current_minute;

    for (int i = 0; i < CHART_DISPLAY_HOURS; i++) {
        int minutes_ago =
            newest_hour_offset_minutes + (i * 60);

        int x = chart_right -
                (minutes_ago * chart_width) /
                chart_window_minutes;
        int label_x = x - (label_width / 2);

        // Keep a label visible while any part of it is still on-screen.
        // This makes the oldest hour disappear gradually on the left and
        // the newest hour appear gradually on the right.
        bool visible =
            label_x < SCREEN_WIDTH &&
            label_x + label_width > 0;

        layer_set_hidden(
            text_layer_get_layer(s_hour_label_layers[i]),
            !visible
        );

        if (!visible) {
            continue;
        }

        int hour_value = (current_hour - i + 24) % 24;

        if (!clock_is_24h_style()) {
            if (hour_value == 0) {
                hour_value = 12;
            } else if (hour_value > 12) {
                hour_value -= 12;
            }
        }

        snprintf(
            s_hour_label_buffers[i],
            sizeof(s_hour_label_buffers[i]),
            "%d",
            hour_value
        );
        text_layer_set_text(
            s_hour_label_layers[i],
            s_hour_label_buffers[i]
        );

        layer_set_frame(
            text_layer_get_layer(s_hour_label_layers[i]),
            GRect(
                label_x,
                BOTTOM_ROW_Y,
                label_width,
                24
            )
        );
    }
}

/**
 * Draw a small filled triangle before the delta value.
 */
static void delta_triangle_layer_update_proc(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    GColor fg_color = s_quick_view_active
        ? GColorBlack
        : (s_reversed ? GColorBlack : GColorWhite);
    graphics_context_set_stroke_color(ctx, fg_color);

    int center_x = bounds.size.w / 2;

    for (int y = 0; y < bounds.size.h; y++) {
        int half_width = (y * center_x) / bounds.size.h;
        graphics_draw_line(
            ctx,
            GPoint(center_x - half_width, y),
            GPoint(center_x + half_width, y)
        );
    }
}

/**
 * Update time ago display based on stored data
 * Also handles showing "No Data" when CGM data is 60+ minutes old
 */
static void update_time_ago_display() {
    if (s_last_minutes_ago < 0) {
        // No data received yet
        return;
    }

    // Calculate current minutes ago based on elapsed time since last data
    time_t now = time(NULL);
    int elapsed_minutes = (int)((now - s_last_data_time) / 60);
    int current_minutes_ago = s_last_minutes_ago + elapsed_minutes;

    // Check if data is stale (60+ minutes old)
    bool is_stale = current_minutes_ago >= 60;

    // Show/hide CGM value, trend arrow, delta and triangle based on staleness.
    // Keep the "last update" text visible so the user can still see how old
    // the last sensor value is.
    layer_set_hidden(text_layer_get_layer(s_cgm_value_layer), is_stale);
    layer_set_hidden(s_trend_layer, is_stale);
    layer_set_hidden(text_layer_get_layer(s_delta_layer), is_stale);
    layer_set_hidden(s_delta_triangle_layer, is_stale);
    layer_set_hidden(text_layer_get_layer(s_no_data_layer), !is_stale);
    update_quick_view_state();

    if (current_minutes_ago < 1000) {
        snprintf(s_time_ago_buffer, sizeof(s_time_ago_buffer), "%dmin", current_minutes_ago);
    } else {
        snprintf(s_time_ago_buffer, sizeof(s_time_ago_buffer), "999+");
    }
    text_layer_set_text(s_time_ago_layer, s_time_ago_buffer);
    layer_set_hidden(text_layer_get_layer(s_time_ago_layer), false);

    // Update alert visibility based on staleness
    update_alert_visibility();
}

/**
 * Update the German weekday and date shown at the top right.
 * Example: "Sa 25.07."
 */
static void update_date(void) {
    static const char *WEEKDAYS_DE[] = {
        "So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"
    };

    time_t now = time(NULL);
    struct tm *tick_time = localtime(&now);

    snprintf(
        s_date_buffer,
        sizeof(s_date_buffer),
        "%s %02d.%02d.",
        WEEKDAYS_DE[tick_time->tm_wday],
        tick_time->tm_mday,
        tick_time->tm_mon + 1
    );

    text_layer_set_text(s_date_layer, s_date_buffer);
}

/**
 * Update time display
 */
static void update_time() {
    time_t now = time(NULL);
    struct tm *tick_time = localtime(&now);

    // Format time (12-hour format without leading zero)
    char time_str[8];
    strftime(time_str, sizeof(time_str),
             clock_is_24h_style() ? "%H:%M" : "%l:%M", tick_time);

    // Trim leading space for 12-hour format
    char *time_ptr = time_str;
    if (time_ptr[0] == ' ') {
        time_ptr++;
    }

    // Set time text
    snprintf(s_time_buffer, sizeof(s_time_buffer), "%s", time_ptr);
    text_layer_set_text(s_time_layer, s_time_buffer);
    update_date();
    update_chart_hour_labels();

}

/**
 * Tick handler - called every minute
 */
static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
    update_time();
    update_time_ago_display();

    // Redraw chart once per minute so age-dependent elements stay current.
    if (s_chart_layer) {
        layer_mark_dirty(s_chart_layer);
    }

    // Request new data only when the configured interval has elapsed.
    if (s_last_data_time > 0 && s_last_minutes_ago >= 0) {
        time_t now = time(NULL);
        int elapsed_minutes = (int)((now - s_last_data_time) / 60);
        int current_cgm_age = s_last_minutes_ago + elapsed_minutes;

        if (current_cgm_age < s_poll_interval_minutes) {
            return;
        }
    }

    // Request data update from phone
    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    if (iter) {
        dict_write_uint8(iter, KEY_REQUEST_DATA, 1);
        app_message_outbox_send();
        start_sync_spinner();
    }
}

/**
 * AppMessage received callback
 */
static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
    // Clear outbox failure flag on successful communication
    s_has_outbox_failure = false;

    // Check for sync error flag from the phone app (API failure)
    Tuple *sync_error_tuple = dict_find(iterator, KEY_SYNC_ERROR);
    if (sync_error_tuple) {
        s_has_sync_error = sync_error_tuple->value->uint8 != 0;
    } else {
        // If not present, assume success (for backwards compatibility)
        s_has_sync_error = false;
    }

    // Show sync spinner briefly to indicate data reception
    start_sync_spinner();

    // Hide loading state on first data received
    if (s_is_loading) {
        hide_loading_show_data();
    }

    // Read delta first (needed for centering calculation)
    Tuple *delta_tuple = dict_find(iterator, KEY_CGM_DELTA);
    if (delta_tuple) {
        snprintf(s_delta_buffer, sizeof(s_delta_buffer), "%s", delta_tuple->value->cstring);
        text_layer_set_text(s_delta_layer, s_delta_buffer);
    }

    // Read CGM value and update layout (uses delta width for centering).
    // An empty value means the phone reported an error/no new measurement.
    // In that case, keep the last displayed value and let its age continue increasing.
    Tuple *cgm_value_tuple = dict_find(iterator, KEY_CGM_VALUE);
    // Pebble stores strings in a flexible array member. Checking the tuple
    // length avoids compiler warnings from testing the cstring address directly.
    bool has_cgm_value =
        cgm_value_tuple &&
        cgm_value_tuple->length > 1;

    if (has_cgm_value) {
        snprintf(s_cgm_value_buffer, sizeof(s_cgm_value_buffer), "%s", cgm_value_tuple->value->cstring);
        text_layer_set_text(s_cgm_value_layer, s_cgm_value_buffer);
        update_layout_for_cgm_text(s_cgm_value_buffer);
        update_current_glucose_color();

        // A visible glucose value must always make the chart layer visible.
        layer_set_hidden(s_chart_layer, false);

        // Always provide at least the newest diagram point.
        // A history tuple in this same message replaces this one-point fallback.
        int current_mgdl = parse_display_glucose_to_mgdl(s_cgm_value_buffer);
        if (current_mgdl > 0) {
            s_chart_values[0] = (int16_t)current_mgdl;
            s_chart_count = 1;
            APP_LOG(APP_LOG_LEVEL_INFO,
                    "Current diagram fallback: %d mg/dL",
                    current_mgdl);
            layer_mark_dirty(s_chart_layer);
        }
    }

    // Read trend
    Tuple *trend_tuple = dict_find(iterator, KEY_CGM_TREND);
    if (trend_tuple) {
        update_trend_icon(trend_tuple->value->uint8);
    }

    // Read time ago only together with a real CGM value.
    // Error messages contain a placeholder age of 0; accepting that would make
    // an old reading look fresh again.
    Tuple *time_ago_tuple = dict_find(iterator, KEY_CGM_TIME_AGO);
    if (time_ago_tuple && has_cgm_value) {
        s_last_minutes_ago = time_ago_tuple->value->int32;
        s_last_data_time = time(NULL);
        update_time_ago_display();
    } else {
        // Keep aging the last successfully received measurement.
        update_time_ago_display();
    }

    // Read chart history
    Tuple *history_tuple = dict_find(iterator, KEY_CGM_HISTORY);
    if (history_tuple) {
        APP_LOG(APP_LOG_LEVEL_INFO, "Chart history tuple length: %d", history_tuple->length);
        parse_chart_history(history_tuple->value->cstring);
        APP_LOG(APP_LOG_LEVEL_INFO, "Chart history received: %d points", s_chart_count);
        layer_mark_dirty(s_chart_layer);
    } else {
        APP_LOG(APP_LOG_LEVEL_WARNING, "No chart history in received message");
    }

    // Read threshold settings
    Tuple *low_threshold_tuple = dict_find(iterator, KEY_LOW_THRESHOLD);
    if (low_threshold_tuple) {
        s_low_threshold = low_threshold_tuple->value->int32;
        layer_mark_dirty(s_chart_layer);
    }

    Tuple *high_threshold_tuple = dict_find(iterator, KEY_HIGH_THRESHOLD);
    if (high_threshold_tuple) {
        s_high_threshold = high_threshold_tuple->value->int32;
        layer_mark_dirty(s_chart_layer);
    }

    Tuple *low_alarm_threshold_tuple =
        dict_find(iterator, KEY_LOW_ALARM_THRESHOLD);
    if (low_alarm_threshold_tuple) {
        s_low_alarm_threshold =
            low_alarm_threshold_tuple->value->int32;
        layer_mark_dirty(s_chart_layer);
    }

    Tuple *high_alarm_threshold_tuple =
        dict_find(iterator, KEY_HIGH_ALARM_THRESHOLD);
    if (high_alarm_threshold_tuple) {
        s_high_alarm_threshold =
            high_alarm_threshold_tuple->value->int32;
        layer_mark_dirty(s_chart_layer);
    }

#ifdef PBL_COLOR
    // Convert configuration RGB values to real opaque Pebble colors.
    Tuple *good_color_tuple = dict_find(iterator, KEY_GOOD_COLOR);
    if (good_color_tuple) {
        GColor color = GColorFromHEX(good_color_tuple->value->int32);
        if (color.a != 0) {
            s_good_color = color;
        }
        layer_mark_dirty(s_chart_layer);
    }

    Tuple *warning_color_tuple = dict_find(iterator, KEY_WARNING_COLOR);
    if (warning_color_tuple) {
        GColor color = GColorFromHEX(warning_color_tuple->value->int32);
        if (color.a != 0) {
            s_warning_color = color;
        }
        layer_mark_dirty(s_chart_layer);
    }

    Tuple *alarm_color_tuple = dict_find(iterator, KEY_ALARM_COLOR);
    if (alarm_color_tuple) {
        GColor color = GColorFromHEX(alarm_color_tuple->value->int32);
        if (color.a != 0) {
            s_alarm_color = color;
        }
        layer_mark_dirty(s_chart_layer);
    }
#endif

    // Thresholds and configured colors may have changed.
    update_current_glucose_color();

    Tuple *poll_interval_tuple = dict_find(iterator, KEY_POLL_INTERVAL);
    if (poll_interval_tuple) {
        int interval = poll_interval_tuple->value->int32;
        if (interval < 1) interval = 1;
        if (interval > 10) interval = 10;
        s_poll_interval_minutes = interval;
    }

    // Handle glucose alarm
    Tuple *alert_tuple = dict_find(iterator, KEY_CGM_ALERT);
    if (alert_tuple) {
        uint8_t alert_type = alert_tuple->value->uint8;
        if (alert_type == ALERT_LOW_SOON) {
            trigger_low_soon_alarm();
        } else if (alert_type == ALERT_HIGH) {
            trigger_high_alarm();
        }
    }

    // Read reversed setting
    Tuple *reversed_tuple = dict_find(iterator, KEY_REVERSED);
    if (reversed_tuple) {
        bool new_reversed = reversed_tuple->value->uint8 != 0;
        if (new_reversed != s_reversed) {
            s_reversed = new_reversed;
            apply_colors();
        }
    }

    // Read optional Quick View color-band setting.
    Tuple *quick_view_tuple = dict_find(iterator, KEY_QUICK_VIEW);
    if (quick_view_tuple) {
        s_quick_view_enabled = quick_view_tuple->value->uint8 != 0;
        update_quick_view_state();
    }

    // Check for setup needed message
    Tuple *needs_setup_tuple = dict_find(iterator, KEY_NEEDS_SETUP);
    if (needs_setup_tuple && needs_setup_tuple->value->uint8) {
        // Hide CGM data, show setup message
        hide_data_layers();
        layer_set_hidden(text_layer_get_layer(s_setup_layer), false);
    } else if (needs_setup_tuple) {
        // Show CGM data, hide setup message
        show_data_layers();
        layer_set_hidden(text_layer_get_layer(s_setup_layer), true);
        // Update CGM value/trend/delta visibility based on staleness
        update_time_ago_display();
    }
}

/**
 * AppMessage dropped callback
 */
static void inbox_dropped_callback(AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped: %d", reason);
}

/**
 * AppMessage failed callback - retry once on failure
 */
static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed: %d", reason);

    // Only retry once to avoid infinite loops
    if (!s_is_retry) {
        APP_LOG(APP_LOG_LEVEL_INFO, "Retrying outbox send...");
        s_is_retry = true;

        DictionaryIterator *retry_iter;
        AppMessageResult result = app_message_outbox_begin(&retry_iter);
        if (result == APP_MSG_OK && retry_iter) {
            dict_write_uint8(retry_iter, KEY_REQUEST_DATA, 1);
            app_message_outbox_send();
        } else {
            APP_LOG(APP_LOG_LEVEL_ERROR, "Retry outbox_begin failed: %d", result);
            s_is_retry = false;
            s_has_outbox_failure = true;
            stop_sync_spinner();
        }
    } else {
        APP_LOG(APP_LOG_LEVEL_ERROR, "Retry also failed, giving up");
        s_is_retry = false;
        s_has_outbox_failure = true;
        stop_sync_spinner();
    }
}

/**
 * AppMessage sent callback
 */
static void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Outbox send success");
    // Reset retry flag on success so next failure can retry
    s_is_retry = false;
    // Spinner will auto-stop via the timer scheduled in start_sync_spinner
}

/**
 * Create a text layer with common settings
 */
static TextLayer* create_text_layer(GRect frame, GFont font, GTextAlignment alignment) {
    TextLayer *layer = text_layer_create(frame);
    text_layer_set_background_color(layer, GColorClear);
    text_layer_set_text_color(layer, GColorWhite);
    text_layer_set_font(layer, font);
    text_layer_set_text_alignment(layer, alignment);
    return layer;
}

/**
 * Main window load
 */
static void main_window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);

    window_set_background_color(window, GColorBlack);

    // Layout (top to bottom):
    // - Time (single row, medium font) - height ~28
    // - CGM value (large) + trend arrow + delta - height ~50
    // - Time ago - height ~20
    // - Chart - remaining space

    // Time and date use exactly the same font and vertical frame so their
    // baselines and visual heights match.
    s_time_layer = create_text_layer(
        GRect(8, TIME_ROW_Y, 84, 40),
        fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD),
        GTextAlignmentLeft
    );
    layer_add_child(window_layer, text_layer_get_layer(s_time_layer));

    // German weekday/date - top right
    s_date_layer = create_text_layer(
        GRect(92, TIME_ROW_Y, bounds.size.w - 100, 40),
        fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD),
        GTextAlignmentRight
    );
    text_layer_set_text(s_date_layer, "");
    layer_add_child(window_layer, text_layer_get_layer(s_date_layer));

    // Divider line between time/date and CGM value row
    s_divider_layer = layer_create(GRect(0, DIVIDER_Y, bounds.size.w, 1));
    layer_set_update_proc(s_divider_layer, divider_layer_update_proc);
    layer_add_child(window_layer, s_divider_layer);

    // Optional full-width Quick View status band behind the CGM row.
    s_quick_view_layer = layer_create(
        GRect(
            0,
            DIVIDER_Y + 1,
            bounds.size.w,
            CHART_Y - DIVIDER_Y - 1
        )
    );
    layer_set_update_proc(
        s_quick_view_layer,
        quick_view_layer_update_proc
    );
    layer_set_hidden(s_quick_view_layer, true);
    layer_add_child(window_layer, s_quick_view_layer);

    // CGM value layer - large font for glucose reading (position updated dynamically)
    // Hidden initially until data arrives to avoid showing wrong position
    s_cgm_value_layer = create_text_layer(
        GRect(6, CGM_ROW_Y, 140, 52),
        fonts_get_system_font(FONT_KEY_BITHAM_42_BOLD),
        GTextAlignmentLeft
    );
    text_layer_set_text(s_cgm_value_layer, "");
    layer_set_hidden(text_layer_get_layer(s_cgm_value_layer), true);
    layer_add_child(window_layer, text_layer_get_layer(s_cgm_value_layer));

    // Vector trend arrow (position updated dynamically)
    // Drawing it ourselves allows the configured glucose color.
    s_trend_layer = layer_create(GRect(108, CGM_ROW_Y + 12, 30, 30));
    layer_set_update_proc(s_trend_layer, trend_layer_update_proc);
    layer_set_hidden(s_trend_layer, true);
    layer_add_child(window_layer, s_trend_layer);

    // Delta layer (position updated dynamically)
    // Shown below the "last update" text, with a small triangle in front.
    s_delta_layer = create_text_layer(
        GRect(162, CGM_ROW_Y + 20, 42, 22),
        fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        GTextAlignmentRight
    );
    text_layer_set_text(s_delta_layer, "");
    layer_set_hidden(text_layer_get_layer(s_delta_layer), true);
    layer_add_child(window_layer, text_layer_get_layer(s_delta_layer));

    s_delta_triangle_layer = layer_create(
        GRect(140, CGM_ROW_Y + 27, 12, 10)
    );
    layer_set_update_proc(s_delta_triangle_layer, delta_triangle_layer_update_proc);
    layer_set_hidden(s_delta_triangle_layer, true);
    layer_add_child(window_layer, s_delta_triangle_layer);

    // "No Data" layer - shown when CGM data is 60+ minutes old, centered in CGM value area
    s_no_data_layer = create_text_layer(
        GRect(0, CGM_ROW_Y + 12, bounds.size.w, 28),
        fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD),
        GTextAlignmentCenter
    );
    text_layer_set_text(s_no_data_layer, "No Data");
    layer_set_hidden(text_layer_get_layer(s_no_data_layer), true);
    layer_add_child(window_layer, text_layer_get_layer(s_no_data_layer));

    // Chart layer - below CGM value row, taller for larger screen
    s_chart_layer = layer_create(GRect(0, CHART_Y, bounds.size.w, CHART_HEIGHT));
    layer_set_update_proc(s_chart_layer, chart_layer_update_proc);
    layer_add_child(window_layer, s_chart_layer);

    // Last update layer - shown above the delta value
    s_time_ago_layer = create_text_layer(
        GRect(148, CGM_ROW_Y + 1, 56, 22),
        fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
        GTextAlignmentRight
    );
    text_layer_set_text(s_time_ago_layer, "");
    layer_set_hidden(text_layer_get_layer(s_time_ago_layer), true);
    layer_add_child(window_layer, text_layer_get_layer(s_time_ago_layer));

    for (int i = 0; i < CHART_DISPLAY_HOURS; i++) {
        s_hour_label_layers[i] = create_text_layer(
            GRect(0, BOTTOM_ROW_Y, 30, 24),
            fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
            GTextAlignmentCenter
        );
        text_layer_set_text(s_hour_label_layers[i], "");
        layer_add_child(window_layer, text_layer_get_layer(s_hour_label_layers[i]));
    }

    update_chart_hour_labels();

    // Sync spinner layer - bottom, to the right of date
    s_sync_layer = layer_create(GRect(110, 206, 16, 16));
    layer_set_update_proc(s_sync_layer, sync_layer_update_proc);
    layer_set_hidden(s_sync_layer, true);  // Sync continues, visual spinner disabled
    layer_add_child(window_layer, s_sync_layer);

    // Alert triangle layer - same position as sync layer (mutually exclusive visibility)
    s_alert_layer = layer_create(GRect(89, 204, 20, 20));
    layer_set_update_proc(s_alert_layer, alert_layer_update_proc);
    layer_set_hidden(s_alert_layer, true);  // Hidden by default
    layer_add_child(window_layer, s_alert_layer);

    // Setup message layer - centered, covers chart area, hidden by default
    s_setup_layer = create_text_layer(
        GRect(8, 70, bounds.size.w - 16, 100),
        fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
        GTextAlignmentCenter
    );
    text_layer_set_text(s_setup_layer, "OpenLibreLinkUp >\nSettings to\nfinish setup.");
    layer_set_hidden(text_layer_get_layer(s_setup_layer), true);
    layer_add_child(window_layer, text_layer_get_layer(s_setup_layer));

    // Loading layer - centered in the data area, shows jumping dots
    s_loading_layer = layer_create(GRect(0, 30, bounds.size.w, 160));
    layer_set_update_proc(s_loading_layer, loading_layer_update_proc);
    layer_add_child(window_layer, s_loading_layer);

    // Start in loading state - hide data layers, start animation and timeout
    hide_data_layers();
    s_loading_timer = app_timer_register(LOADING_ANIMATION_INTERVAL, loading_timer_callback, NULL);
    s_loading_timeout_timer = app_timer_register(LOADING_TIMEOUT_MS, loading_timeout_callback, NULL);

    // Initialize time display
    update_time();
}

/**
 * Main window unload
 */
static void main_window_unload(Window *window) {
    // Cancel loading timers if running
    if (s_loading_timer) {
        app_timer_cancel(s_loading_timer);
        s_loading_timer = NULL;
    }
    if (s_loading_timeout_timer) {
        app_timer_cancel(s_loading_timeout_timer);
        s_loading_timeout_timer = NULL;
    }

    // Cancel sync timers if running
    if (s_sync_timer) {
        app_timer_cancel(s_sync_timer);
        s_sync_timer = NULL;
    }
    if (s_sync_stop_timer) {
        app_timer_cancel(s_sync_stop_timer);
        s_sync_stop_timer = NULL;
    }

    text_layer_destroy(s_time_layer);
    text_layer_destroy(s_cgm_value_layer);
    text_layer_destroy(s_delta_layer);
    layer_destroy(s_delta_triangle_layer);
    text_layer_destroy(s_time_ago_layer);
    for (int i = 0; i < CHART_DISPLAY_HOURS; i++) {
        text_layer_destroy(s_hour_label_layers[i]);
    }
    text_layer_destroy(s_setup_layer);
    text_layer_destroy(s_no_data_layer);
    layer_destroy(s_trend_layer);
    layer_destroy(s_chart_layer);
    layer_destroy(s_divider_layer);
    layer_destroy(s_quick_view_layer);
    layer_destroy(s_loading_layer);
    text_layer_destroy(s_date_layer);
    layer_destroy(s_sync_layer);
    layer_destroy(s_alert_layer);

}

/**
 * Initialize app
 */
static void init() {
    // Create main window
    s_main_window = window_create();
    window_set_window_handlers(s_main_window, (WindowHandlers) {
        .load = main_window_load,
        .unload = main_window_unload
    });
    window_stack_push(s_main_window, true);

    // Register tick handler
    tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);

    // Register AppMessage callbacks
    app_message_register_inbox_received(inbox_received_callback);
    app_message_register_inbox_dropped(inbox_dropped_callback);
    app_message_register_outbox_failed(outbox_failed_callback);
    app_message_register_outbox_sent(outbox_sent_callback);

    // Open AppMessage with appropriate buffer sizes
    // Inbox needs to hold chart history (26 values * ~8 chars each = ~208) plus other fields
    app_message_open(1024, 128);
}

/**
 * Deinitialize app
 */
static void deinit() {
    tick_timer_service_unsubscribe();
    window_destroy(s_main_window);
}

/**
 * Main entry point
 */
int main(void) {
    init();
    app_event_loop();
    deinit();
}
